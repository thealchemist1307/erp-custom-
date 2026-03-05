#!/usr/bin/env bash

set -euo pipefail

MODE="${1:-prod}"
BACKUP_ROOT="backup"

case "${MODE}" in
  prod)
    COMPOSE_FILE="docker-compose.yml"
    ;;
  dev)
    COMPOSE_FILE="docker-compose.dev.yml"
    ;;
  *)
    echo "Usage: $0 [prod|dev]" >&2
    exit 1
    ;;
esac

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required but not installed." >&2
  exit 1
fi

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "Compose file not found: ${COMPOSE_FILE}" >&2
  exit 1
fi

if [[ ! -d "${BACKUP_ROOT}" ]]; then
  echo "Backup folder not found: ${BACKUP_ROOT}" >&2
  exit 1
fi

LATEST_BACKUP_DIR="$(
  find "${BACKUP_ROOT}" -mindepth 1 -maxdepth 1 -type d | sort | tail -n 1
)"

if [[ -z "${LATEST_BACKUP_DIR}" ]]; then
  echo "No backup folders found inside ${BACKUP_ROOT}" >&2
  exit 1
fi

mapfile -t VOLUMES < <(docker compose -f "${COMPOSE_FILE}" config --volumes)

if [[ "${#VOLUMES[@]}" -eq 0 ]]; then
  echo "No volumes defined in ${COMPOSE_FILE}" >&2
  exit 1
fi

resolve_archive_name() {
  local volume="$1"

  if [[ -f "${LATEST_BACKUP_DIR}/${volume}.tgz" ]]; then
    printf '%s.tgz\n' "${volume}"
    return 0
  fi

  if [[ "${MODE}" == "dev" && "${volume}" == inkcast-dev-* ]]; then
    local prod_volume="${volume/inkcast-dev-/inkcast-}"

    if [[ -f "${LATEST_BACKUP_DIR}/${prod_volume}.tgz" ]]; then
      printf '%s.tgz\n' "${prod_volume}"
      return 0
    fi
  fi

  return 1
}

declare -A ARCHIVES=()

for volume in "${VOLUMES[@]}"; do
  if ! archive_name="$(resolve_archive_name "${volume}")"; then
    echo "Missing archive for volume ${volume} in ${LATEST_BACKUP_DIR}" >&2
    exit 1
  fi

  ARCHIVES["${volume}"]="${archive_name}"
done

mapfile -t RUNNING_SERVICES < <(docker compose -f "${COMPOSE_FILE}" ps --services --status running || true)

SERVICES_STOPPED=0
RESTORE_COMPLETE=0

cleanup() {
  if [[ "${SERVICES_STOPPED}" -eq 1 && "${RESTORE_COMPLETE}" -eq 0 && "${#RUNNING_SERVICES[@]}" -gt 0 ]]; then
    echo "Restore failed. Attempting to restart previously running services..."
    docker compose -f "${COMPOSE_FILE}" start "${RUNNING_SERVICES[@]}" >/dev/null || true
  fi
}

trap cleanup EXIT

if [[ "${#RUNNING_SERVICES[@]}" -gt 0 ]]; then
  echo "Stopping running services: ${RUNNING_SERVICES[*]}"
  docker compose -f "${COMPOSE_FILE}" stop "${RUNNING_SERVICES[@]}"
  SERVICES_STOPPED=1
fi

restore_volume() {
  local volume="$1"
  local archive_name="${ARCHIVES[${volume}]}"
  local archive_path="${LATEST_BACKUP_DIR}/${archive_name}"

  echo "Restoring ${volume} from ${archive_path}"
  docker volume create "${volume}" >/dev/null

  docker run --rm \
    -v "${volume}:/to" \
    -v "$(pwd)/${LATEST_BACKUP_DIR}:/backup:ro" \
    alpine \
    sh -lc "find /to -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +; tar xzf /backup/${archive_name} -C /to"
}

for volume in "${VOLUMES[@]}"; do
  restore_volume "${volume}"
done

if [[ "${#RUNNING_SERVICES[@]}" -gt 0 ]]; then
  echo "Starting previously running services: ${RUNNING_SERVICES[*]}"
  docker compose -f "${COMPOSE_FILE}" start "${RUNNING_SERVICES[@]}"
fi

RESTORE_COMPLETE=1

cat <<EOF
Restore complete.
Mode: ${MODE}
Compose file: ${COMPOSE_FILE}
Backup used: ${LATEST_BACKUP_DIR}
EOF
