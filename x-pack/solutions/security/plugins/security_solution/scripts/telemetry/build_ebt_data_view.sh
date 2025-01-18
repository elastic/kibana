#!/usr/bin/env sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

# Set default values for optional arguments if not provided
space_id="securitysolution"
telemetry_type="browser"

# Function to read from Vault and check for 403 errors
vault_read() {
  local secret_path=$1
  local field=$2
  output=$(vault read --field="$field" "$secret_path" 2>&1)
  if echo "$output" | grep -q "permission denied"; then
    echo "Error: Permission denied. Please log in to Vault and ensure you have siem-team access: https://github.com/elastic/infra/blob/master/docs/vault/README.md" >&2
    exit 1
  fi
  echo "$output"
}

# Fetch values from Vault and check they are defined
kibana_url=$(vault_read secret/siem-team/elastic-cloud/telemetry-v2-staging url)
if [ -z "$kibana_url" ]; then
  echo "Error: kibana_url is a mandatory argument." >&2
  exit 1
fi

# Check if mandatory arguments are provided
api_key=$(vault_read secret/siem-team/elastic-cloud/telemetry-v2-staging api_key)
if [ -z "$api_key" ]; then
  echo "Error: api_key is a mandatory argument." >&2
  exit 1
fi


# Parse named arguments
while [ "$#" -gt 0 ]; do
  case "$1" in
    --api_key=*)
      api_key="${1#*=}"
      ;;
    --kibana_url=*)
      kibana_url="${1#*=}"
      ;;
    --space_id=*)
      space_id="${1#*=}"
      ;;
    --telemetry_type=*)
      telemetry_type="${1#*=}"
      ;;
    *)
      echo "Error: Invalid argument: $1" >&2
      exit 1
      ;;
  esac
  shift
done


# Validate telemetry_type
if [ "$telemetry_type" != "browser" ] && [ "$telemetry_type" != "server" ]; then
  echo "Error: telemetry_type must be either 'browser' or 'server'." >&2
  exit 1
fi

npx ts-node "$(dirname "${0}")/build_ebt_data_view.ts" \
  --api_key="$api_key" \
  --kibana_url="$kibana_url" \
  --space_id="$space_id" \
  --telemetry_type="$telemetry_type"
