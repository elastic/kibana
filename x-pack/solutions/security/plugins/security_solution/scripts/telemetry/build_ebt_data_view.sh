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
api_key=""
kibana_url=""

# Function to read from Vault and check for 403 errors
vault_read() {
  local secret_path=$1
  local field=$2
  
  # Check if vault command exists
  if ! command -v vault >/dev/null 2>&1; then
    echo "Error: vault command not found. Please ensure Vault CLI is installed and in PATH." >&2
    exit 1
  fi
  
  # Capture output, separating stdout and stderr
  output=$(vault read --field="$field" "$secret_path" 2>&1)
  exit_code=$?
  
  # Check for errors
  if [ $exit_code -ne 0 ]; then
    echo "Error: Vault read failed with exit code $exit_code. Output: $output" >&2
    echo "Please log in to Vault and ensure you have siem-team access: https://github.com/elastic/infra/blob/master/docs/vault/README.md" >&2
    exit 1
  fi
  
  # Check for permission denied messages
  if echo "$output" | grep -qi "permission denied\|access denied"; then
    echo "Error: Permission denied accessing Vault secret." >&2
    echo "Please log in to Vault and ensure you have siem-team access: https://github.com/elastic/infra/blob/master/docs/vault/README.md" >&2
    exit 1
  fi
  
  # Trim whitespace and return (preserve the value even if it contains special chars)
  trimmed=$(echo "$output" | tr -d '\n\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  
  # Check if result is empty after trimming
  if [ -z "$trimmed" ]; then
    echo "Error: Vault returned empty value for field '$field' in '$secret_path'" >&2
    exit 1
  fi
  
  echo "$trimmed"
}

# Parse named arguments first (command-line args take precedence)
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

# Fetch values from Vault only if not provided via command-line
if [ -z "$kibana_url" ]; then
  kibana_url=$(vault_read secret/siem-team/elastic-cloud/telemetry-v2-staging url)
  if [ -z "$kibana_url" ]; then
    echo "Error: kibana_url is a mandatory argument. Provide via --kibana_url= or ensure Vault access." >&2
    exit 1
  fi
fi

if [ -z "$api_key" ]; then
  api_key=$(vault_read secret/siem-team/elastic-cloud/telemetry-v2-staging api_key)
  if [ -z "$api_key" ]; then
    echo "Error: api_key is a mandatory argument. Provide via --api_key= or ensure Vault access." >&2
    exit 1
  fi
fi


# Validate telemetry_type
if [ "$telemetry_type" != "browser" ] && [ "$telemetry_type" != "server" ]; then
  echo "Error: telemetry_type must be either 'browser' or 'server'." >&2
  exit 1
fi

# Ensure required variables are set
if [ -z "$api_key" ]; then
  echo "Error: api_key is not set. Check Vault access or provide via --api_key=" >&2
  exit 1
fi

if [ -z "$kibana_url" ]; then
  echo "Error: kibana_url is not set. Check Vault access or provide via --kibana_url=" >&2
  exit 1
fi

SCRIPT_DIR="$(dirname "${0}")"
SCRIPT_PATH="${SCRIPT_DIR}/build_ebt_data_view.ts"

# Change to script directory to ensure relative paths work correctly
cd "${SCRIPT_DIR}" || exit 1

# Call node directly with properly quoted arguments
node -r "@kbn/setup-node-env" "${SCRIPT_PATH}" \
  --api_key="${api_key}" \
  --kibana_url="${kibana_url}" \
  --space_id="${space_id}" \
  --telemetry_type="${telemetry_type}"
