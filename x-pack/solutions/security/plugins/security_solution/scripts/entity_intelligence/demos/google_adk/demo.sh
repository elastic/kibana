#!/bin/sh
set -eu

demo_directory=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
: "${EI_GOOGLE_PROJECT_ID:?Set an explicitly selected disposable test project}"
: "${EI_GOOGLE_ACCOUNT:?Set the authorized Google account email}"

exec "${EI_PYTHON_BINARY:-python3}" "$demo_directory/infra/manage.py" \
  --gcloud "${EI_GCLOUD_BINARY:-gcloud}" \
  --project "$EI_GOOGLE_PROJECT_ID" \
  --account "$EI_GOOGLE_ACCOUNT" \
  "$@"
