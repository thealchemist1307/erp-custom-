#!/usr/bin/env bash

set -euo pipefail

BACKUP_ROOT="${1:-backup}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEST_DIR="${BACKUP_ROOT%/}/${TIMESTAMP}"

VOLUMES=(
  "inkcast-db-data"
  "inkcast-sites"
  "inkcast-logs"
  "inkcast-redis-queue-data"
)

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required but not installed." >&2
  exit 1
fi

mkdir -p "${DEST_DIR}"

backup_volume() {
  local volume="$1"
  local archive_path="${DEST_DIR}/${volume}.tgz"

  echo "Backing up ${volume} -> ${archive_path}"

  docker run --rm \
    -v "${volume}:/from:ro" \
    -v "$(pwd)/${DEST_DIR}:/backup" \
    alpine \
    sh -lc "cd /from && tar czf /backup/${volume}.tgz ."
}

for volume in "${VOLUMES[@]}"; do
  if ! docker volume inspect "${volume}" >/dev/null 2>&1; then
    echo "Skipping ${volume}: Docker volume not found." >&2
    continue
  fi

  backup_volume "${volume}"
done

cat <<EOF
Backup complete.
Folder: ${DEST_DIR}
Archives:
$(find "${DEST_DIR}" -maxdepth 1 -type f -name '*.tgz' | sort)
EOF
