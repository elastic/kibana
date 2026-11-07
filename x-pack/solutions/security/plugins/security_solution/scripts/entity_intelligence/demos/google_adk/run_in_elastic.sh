#!/bin/sh
set -eu

demo_directory=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
for argument in "$@"; do
  case "$argument" in -h|--help) exec "$demo_directory/demo.sh" invoke "$@" ;; esac
done
"$demo_directory/demo.sh" invoke "$@"
exec "${EI_PYTHON_BINARY:-python3}" "$demo_directory/sync_to_elastic.py" --once
