#!/usr/bin/env bash
set -euo pipefail

MODULE="github.com/r00tman/corrupter@latest"
IMAGE="docker.io/library/golang:latest"
DEST="${HOME}/.local/bin"
BIN="corrupter"

workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT

echo ">> Building ${MODULE} using ${IMAGE} ..."
podman run --rm \
    -e GOBIN=/out \
    -e CGO_ENABLED=0 \
    -v "${workdir}:/out:Z" \
    "${IMAGE}" \
    go install "${MODULE}"

if [[ ! -f "${workdir}/${BIN}" ]]; then
    echo "!! Build did not produce ${BIN}" >&2
    exit 1
fi

echo ">> Installing to ${DEST}/${BIN} ..."
mkdir -p "${DEST}"
install -m 0755 "${workdir}/${BIN}" "${DEST}/${BIN}"

echo ">> Done: $(command -v "${BIN}" || echo "${DEST}/${BIN}")"
