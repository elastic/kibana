#!/bin/bash

fail() {
  printf "%s\n" "$@" >&2
  exit 1
}

if [ -z "${BASH_VERSION:-}" ]; then
  fail "Bash is required to run this script"
fi

if ! command -v curl >/dev/null 2>&1; then
  fail "curl is required to run this script"
fi

# Check if the `lsof` command exists in PATH, if not use `/usr/sbin/lsof` if possible
LSOF_PATH=""
if command -v lsof >/dev/null 2>&1; then
  LSOF_PATH=$(command -v lsof)
elif command -v /usr/sbin/lsof >/dev/null 2>&1; then
  LSOF_PATH="/usr/sbin/lsof"
fi

install_api_key_encoded=""
ingest_api_key_encoded=""
kibana_api_endpoint=""
onboarding_flow_id=""
elastic_agent_version=""

help() {
  echo "Usage: sudo ./auto-detect.sh <arguments>"
  echo ""
  echo "Arguments:"
  echo "  --install-key=<value>  Base64 Encoded API key that has priviledges to install integrations."
  echo "  --ingest-key=<value>   Base64 Encoded API key that has priviledges to ingest data."
  echo "  --kibana-url=<value>  Kibana API endpoint."
  echo "  --id=<value>   Onboarding flow ID."
  echo "  --ea-version=<value>   Elastic Agent version."
  exit 1
}

ensure_argument() {
  if [ -z "$1" ]; then
    echo "Error: Missing value for $2."
    help
  fi
}

if [ "$EUID" -ne 0 ]; then
  echo "Error: This script must be run as root."
  help
fi

# Parse command line arguments
for i in "$@"; do
  case $i in
  --install-key=*)
    shift
    install_api_key_encoded="${i#*=}"
    ;;
  --ingest-key=*)
    shift
    ingest_api_key_encoded="${i#*=}"
    ;;
  --kibana-url=*)
    shift
    kibana_api_endpoint="${i#*=}"
    ;;
  --id=*)
    shift
    onboarding_flow_id="${i#*=}"
    ;;
  --ea-version=*)
    shift
    elastic_agent_version="${i#*=}"
    ;;
  --help)
    help
    ;;
  *)
    echo "Unknown option: $i"
    help
    ;;
  esac
done

ensure_argument "$install_api_key_encoded" "--install-key"
ensure_argument "$ingest_api_key_encoded" "--ingest-key"
ensure_argument "$kibana_api_endpoint" "--kibana-url"
ensure_argument "$onboarding_flow_id" "--id"
ensure_argument "$elastic_agent_version" "--ea-version"

update_step_progress() {
  local STEPNAME="$1"
  local STATUS="$2" # "incomplete" | "complete" | "disabled" | "loading" | "warning" | "danger" | "current"
  local MESSAGE=${3:-}
  local PAYLOAD=${4:-}
  local data=""

  MESSAGE=$(echo "$MESSAGE" | sed 's/"/\\"/g')

  if [ -z "$PAYLOAD" ]; then
    data="{\"status\":\"${STATUS}\", \"message\":\"${MESSAGE}\"}"
  else
    data="{\"status\":\"${STATUS}\", \"message\":\"${MESSAGE}\", \"payload\":${PAYLOAD}}"
  fi
  curl --request POST \
    --url "${kibana_api_endpoint}/internal/observability_onboarding/flow/${onboarding_flow_id}/step/${STEPNAME}" \
    --header "Authorization: ApiKey ${install_api_key_encoded}" \
    --header "Content-Type: application/json" \
    --header "kbn-xsrf: true" \
    --header "x-elastic-internal-origin: Kibana" \
    --data "$data" \
    --output /dev/null \
    --no-progress-meter \
    --fail
}

update_step_progress "logs-detect" "initialize"

known_integrations_list_string=""
selected_known_integrations_array=()
detected_patterns=()
selected_known_integrations_tsv_string=""
unknown_log_file_path_list_string=""
unknown_log_file_pattern_list_string=""
selected_unknown_log_file_pattern_array=()
excluded_options_string=""
selected_unknown_log_file_pattern_tsv_string=""
custom_log_file_path_list_tsv_string=""
elastic_agent_artifact_name=""
elastic_agent_config_path="/opt/Elastic/Agent/elastic-agent.yml"
elastic_agent_tmp_config_path="/tmp/elastic-agent-config.tar"
integration_names=()
integration_titles=()
config_files_with_password=()

OS="$(uname)"
ARCH="$(uname -m)"
os=linux
arch=x86_64
if [ "${OS}" == "Linux" ]; then
  if [ "${ARCH}" == "aarch64" ]; then
    arch=arm64
  fi
elif [ "${OS}" == "Darwin" ]; then
  os=darwin
  if [ "${ARCH}" == "arm64" ]; then
    arch=aarch64
  fi
  elastic_agent_config_path=/Library/Elastic/Agent/elastic-agent.yml
else
  update_step_progress "logs-detect" "danger" "Unable to run auto-detect script on ${os} (${arch})"
  fail "This script is only supported on Linux and macOS"
fi

elastic_agent_artifact_name="elastic-agent-${elastic_agent_version}-${os}-${arch}"

download_elastic_agent() {
  local download_url="https://artifacts.elastic.co/downloads/beats/elastic-agent/${elastic_agent_artifact_name}.tar.gz"
  rm -rf "./${elastic_agent_artifact_name}" "./${elastic_agent_artifact_name}.tar.gz"
  curl -L -O "$download_url" --silent --fail

  if [ "$?" -eq 0 ]; then
    printf "\e[32;1m✓\e[0m %s\n" "Elastic Agent downloaded to $(pwd)/$elastic_agent_artifact_name.tar.gz"
    update_step_progress "ea-download" "complete"
  else
    update_step_progress "ea-download" "danger" "Failed to download Elastic Agent, see script output for error."
    fail "Failed to download Elastic Agent"
  fi
}

extract_elastic_agent() {
  tar -xzf "${elastic_agent_artifact_name}.tar.gz"

  if [ "$?" -eq 0 ]; then
    printf "\e[32;1m✓\e[0m %s\n" "Archive extracted"
    update_step_progress "ea-extract" "complete"
  else
    update_step_progress "ea-extract" "danger" "Failed to extract Elastic Agent, see script output for error."
    fail "Failed to extract Elastic Agent"
  fi
}

install_elastic_agent() {
  "./${elastic_agent_artifact_name}/elastic-agent" install -f -n >/dev/null

  if [ "$?" -eq 0 ]; then
    printf "\e[32;1m✓\e[0m %s\n" "Elastic Agent installed to $(dirname "$elastic_agent_config_path")"
    update_step_progress "ea-install" "complete"
  else
    update_step_progress "ea-install" "danger" "Failed to install Elastic Agent, see script output for error."
    fail "Failed to install Elastic Agent"
  fi
}

wait_for_elastic_agent_status() {
  local MAX_RETRIES=10
  local i=0
  elastic-agent status >/dev/null 2>&1
  local ELASTIC_AGENT_STATUS_EXIT_CODE="$?"
  while [ "$ELASTIC_AGENT_STATUS_EXIT_CODE" -ne 0 ] && [ $i -le $MAX_RETRIES ]; do
    sleep 1
    elastic-agent status >/dev/null 2>&1
    ELASTIC_AGENT_STATUS_EXIT_CODE="$?"
    ((i++))
  done

  if [ "$ELASTIC_AGENT_STATUS_EXIT_CODE" -ne 0 ]; then
    update_step_progress "ea-status" "warning" "Unable to determine agent status"
  fi
}

ensure_elastic_agent_healthy() {
  # https://www.elastic.co/guide/en/fleet/current/elastic-agent-cmd-options.html#elastic-agent-status-command
  ELASTIC_AGENT_STATES=(STARTING CONFIGURING HEALTHY DEGRADED FAILED STOPPING UPGRADING ROLLBACK)
  # Get elastic-agent status in json format | removing extra states in the json | finding "state":value | removing , | removing "state": | trimming the result
  ELASTIC_AGENT_STATE="$(elastic-agent status --output json | sed -n '/components/q;p' | grep state | sed 's/\(.*\),/\1 /' | sed 's/"state": //' | sed 's/[[:space:]]//g')"
  # Get elastic-agent status in json format | removing extra states in the json | finding "message":value | removing , | removing "message": | trimming the result | removing ""
  ELASTIC_AGENT_MESSAGE="$(elastic-agent status --output json | sed -n '/components/q;p' | grep message | sed 's/\(.*\),/\1 /' | sed 's/"message": //' | sed 's/[[:space:]]//g' | sed 's/\"//g')"
  # Get elastic-agent status in json format | removing extra ids in the json | finding "id":value | removing , | removing "id": | trimming the result | removing ""
  ELASTIC_AGENT_ID="$(elastic-agent status --output json | sed -n '/components/q;p' | grep \"id\" | sed 's/\(.*\),/\1 /' | sed 's/"id": //' | sed 's/[[:space:]]//g' | sed 's/\"//g')"

  if [ "${ELASTIC_AGENT_STATE}" = "2" ] && [ "${ELASTIC_AGENT_MESSAGE}" = "Running" ]; then
    update_step_progress "ea-status" "complete" "" "{\"agentId\": \"${ELASTIC_AGENT_ID}\"}"
  else
    update_step_progress "ea-status" "danger" "Expected agent status HEALTHY / Running but got ${ELASTIC_AGENT_STATES[ELASTIC_AGENT_STATE]} / ${ELASTIC_AGENT_MESSAGE}"
    fail "Elastic Agent is not healthy.\nCurrent status: ${ELASTIC_AGENT_STATES[ELASTIC_AGENT_STATE]} / ${ELASTIC_AGENT_MESSAGE}.\nFor help, please see our troubleshooting guide at https://www.elastic.co/guide/en/fleet/8.13/fleet-troubleshooting.html."
  fi
}

backup_elastic_agent_config() {
  if [ -f "$elastic_agent_config_path" ]; then
    printf "\n%s \e[36m%s\e[0m\n" "Existing config found at" "$elastic_agent_config_path"

    printf "\n\e[1;36m?\e[0m \e[1m%s\e[0m \e[2m%s\e[0m" "Create backup and continue installation?" "[Y/n] (default: Yes): "
    read confirmation_reply
    confirmation_reply="${confirmation_reply:-Y}"

    if [[ "$confirmation_reply" =~ ^[Yy](es)?$ ]]; then
      local backup_path="$(pwd)/$(basename "${elastic_agent_config_path%.yml}.$(date +%s).yml")" # e.g. /opt/Elastic/Agent/elastic-agent.1712267614.yml
      # Backup to tar archive if `inputs.d` directory exists
      if [ -d "$(dirname "$elastic_agent_config_path")/inputs.d" ]; then
        backup_path="${backup_path%.yml}.tar" # Change file extension to `.tar`
        tar --create --file "$backup_path" --directory "$(dirname "$elastic_agent_config_path")" "$(basename "$elastic_agent_config_path")" 'inputs.d'
      else
        cp "$elastic_agent_config_path" "$backup_path"
      fi

      if [ "$?" -eq 0 ]; then
        printf "\n\e[32;1m✓\e[0m %s \e[36m%s\e[0m\n" "Backup saved to" "$backup_path"
      else
        update_step_progress "ea-config" "danger" "Failed to backup existing configuration"
        fail "Failed to backup existing config - Try manually creating a backup or delete your existing config before re-running this script"
      fi
    else
      fail "Installation aborted"
    fi
  fi
}

install_integrations() {
  local install_integrations_api_body_string=""

  for item in "${selected_known_integrations_array[@]}"; do
    local metadata=""

    case "$item" in
    "system")
      metadata="\t$(hostname | tr '[:upper:]' '[:lower:]')"
      ;;
    esac

    install_integrations_api_body_string+="$item\tregistry$metadata\n"
  done

  for item in "${selected_unknown_log_file_pattern_array[@]}" "${custom_log_file_path_list_array[@]}"; do
    local integration_name=$(generate_custom_integration_name "$item")

    install_integrations_api_body_string+="$integration_name\tcustom\t$item\n"
  done

  curl --request POST \
    --url "$kibana_api_endpoint/internal/observability_onboarding/flow/$onboarding_flow_id/integrations/install" \
    --header "Authorization: ApiKey $install_api_key_encoded" \
    --header "Content-Type: text/tab-separated-values" \
    --header "Accept: application/x-tar" \
    --header "kbn-xsrf: true" \
    --header "x-elastic-internal-origin: Kibana" \
    --data "$(echo -e "$install_integrations_api_body_string")" \
    --no-progress-meter \
    --fail \
    --output "$elastic_agent_tmp_config_path"

  if [ "$?" -eq 0 ]; then
    printf "\n\e[32;1m✓\e[0m %s\n" "Integrations installed"
  else
    update_step_progress "install-integrations" "danger" "Failed to install integrations"
    fail "Failed to install integrations"
  fi
}

apply_elastic_agent_config() {
  local decoded_ingest_api_key=$(echo "$ingest_api_key_encoded" | base64 -d)

  # Verify that the downloaded archive contains the expected `elastic-agent.yml` file
  tar --list --file "$elastic_agent_tmp_config_path" | grep "$(basename "$elastic_agent_config_path")" >/dev/null &&
    # Remove existing config file including `inputs.d` directory
    rm -rf "$elastic_agent_config_path" "$(dirname "$elastic_agent_config_path")/inputs.d" &&
    # Extract new config files from downloaded archive
    tar --extract --file "$elastic_agent_tmp_config_path" --directory "$(dirname "$elastic_agent_config_path")" &&
    # Replace placeholder with the Ingest API key
    sed -i='' "s/\${API_KEY}/$decoded_ingest_api_key/" "$elastic_agent_config_path"
  if [ "$?" -eq 0 ]; then
    printf "\e[32;1m✓\e[0m %s\n" "Config files written to:"
    while IFS= read -r file; do
      local path="$(dirname "$elastic_agent_config_path")/$file"
      printf "  \e[36m%s\e[0m\n" "$path"
      grep '<PASSWORD>' "$path" >/dev/null
      if [ "$?" -eq 0 ]; then
        config_files_with_password+=("$path")
      fi
    done < <(tar --list --file "$elastic_agent_tmp_config_path" | grep '\.yml$')

    update_step_progress "ea-config" "complete"
  else
    update_step_progress "ea-config" "danger" "Failed to configure Elastic Agent"
    fail "Failed to configure Elastic Agent"
  fi
}

read_open_log_file_list() {
  local exclude_patterns=(
    "^\/Users\/.+?\/Library\/Application Support\/"
    "^\/Users\/.+?\/Library\/Group Containers\/"
    "^\/Users\/.+?\/Library\/Containers\/"
    "^\/Users\/.+?\/Library\/Caches\/"
    "^\/private\/"

    # Integrations only ingest a subset of application logs so there are scenarios where additional
    # log files could be detected and displayed as a "custom log" alongside the detected integration
    # they belong to. To avoid this UX issue we exclude all log files inside application directories
    # from the custom log file detection
    "^\/var\/log\/nginx\/"
    "^\/var\/log\/apache2\/"
    "^\/var\/log\/httpd\/"
    "^\/var\/log\/mysql\/"
    "^\/var\/log\/postgresql\/"
    "^\/var\/log\/redis\/"
    "^\/var\/log\/rabbitmq\/"
    "^\/var\/log\/kafka\/"
    "^\/var\/lib\/docker\/"
    "^\/var\/log\/mongodb\/"
    "^\/opt\/tomcat\/logs\/"
    "^\/var\/log\/prometheus\/"

    # Exclude previous installation logs
    "^\/opt\/Elastic\/Agent\/"
    "^\/Library\/Elastic\/Agent\/"
  )

  # Excluding all patterns that correspond to known integrations
  # that we are detecting separately
  for pattern in "${detected_patterns[@]}"; do
    exclude_patterns+=("$pattern")
  done

  local list=$("$LSOF_PATH" -Fn / | grep "^n.*\.log$" | cut -c2- | sort -u)

  # Filtering by the exclude patterns
  while IFS= read -r line; do
    if ! grep -qE "$(
      IFS="|"
      echo "${exclude_patterns[*]}"
    )" <<<"$line"; then
      unknown_log_file_path_list_string+="$line\n"
    fi
  done <<<"$list"
}

detect_known_integrations() {
  # Always suggesting to install System integartion.
  # Even when there is no system logs on the host,
  # System integration will still be able to to collect metrics.
  known_integrations_list_string+="system"$'\n'
  integrations_config_url="${kibana_api_endpoint}/plugins/observabilityOnboarding/assets/integrations.conf"

  integrations_config=$(curl "${integrations_config_url}" --silent --fail)
  local integration=""
  local patterns=()

  # Debug: Check if the config file exists
  if [[ -z "$integrations_config" ]]; then
    echo "Failed to retrieve config file"
    exit 1
  fi

  while IFS= read -r line; do

    # Skip comments and empty lines
    if [[ $line =~ ^\s*# || -z $line ]]; then
      continue
    fi

    # Process section headers
    if [[ $line =~ ^\[([a-zA-Z0-9_]+)\] ]]; then
      # If we were processing a previous section, check patterns for the previous integration
      if [[ -n "$integration" && ${#patterns[@]} -gt 0 ]]; then
        for pattern in "${patterns[@]}"; do
          pattern=$(echo "$pattern" | xargs) # Trim leading/trailing spaces
          if compgen -G "$pattern" >/dev/null; then
            known_integrations_list_string+="$integration"$'\n'
            detected_patterns+=("${patterns[@]}")
            break
          fi
        done
      fi

      # Start a new section
      integration="${BASH_REMATCH[1]}"
      patterns=()
      continue
    fi

    # Process patterns
    if [[ $line =~ ^patterns= ]]; then
      # Capture patterns by trimming spaces and handling multi-line patterns
      IFS=$'\n' read -r -d '' -a patterns <<<"${line#patterns=}"
      patterns=($(echo "${patterns[@]}" | xargs)) # Trim leading/trailing spaces
    elif [[ $line =~ ^title=.*$ ]]; then
      # Capture titles
      integration_titles+=("${line#title=}")
      integration_names+=("$integration")
    elif [[ -n "$integration" && -n "$line" ]]; then
      # Capture multi-line patterns if not directly following "patterns="
      patterns+=("$(echo "$line" | xargs)") # Trim leading/trailing spaces
    fi
  done <<< "$integrations_config"

  # Check patterns for the last section
  if [[ -n "$integration" && ${#patterns[@]} -gt 0 ]]; then
    for pattern in "${patterns[@]}"; do
      pattern=$(echo "$pattern" | xargs) # Trim leading/trailing spaces
      if compgen -G "$pattern" >/dev/null; then
        known_integrations_list_string+="$integration"$'\n'
        detected_patterns+=("${patterns[@]}")
        break
      fi
    done
  fi
}

known_integration_title() {
  local integration=$1
  for i in "${!integration_names[@]}"; do
    if [[ "${integration_names[$i]}" == "$integration" ]]; then
      echo "${integration_titles[$i]}"
      return
    fi
  done
  echo "Unknown"
}

build_unknown_log_file_patterns() {
  while IFS= read -r log_file_path; do
    if [ -z "$log_file_path" ]; then
      continue
    fi

    unknown_log_file_pattern_list_string+="$(dirname "$log_file_path")/*.log\n"
  done <<<"$(echo -e "$unknown_log_file_path_list_string")"

  unknown_log_file_pattern_list_string=$(echo -e "$unknown_log_file_pattern_list_string" | sort -u)
}

function select_list() {
  local known_integrations_options=()
  local unknown_logs_options=()

  while IFS= read -r line; do
    if [[ -z "$line" ]]; then
      continue
    fi
    known_integrations_options+=("$line")
  done <<<"$known_integrations_list_string"

  while IFS= read -r line; do
    if [[ -z "$line" ]]; then
      continue
    fi
    unknown_logs_options+=("$line")
  done <<<"$unknown_log_file_pattern_list_string"

  local options=("${known_integrations_options[@]}" "${unknown_logs_options[@]}")

  for i in "${!options[@]}"; do
    if [[ "$i" -lt "${#known_integrations_options[@]}" ]]; then
      printf "\e[32m%s)\e[0m %s\n" "$((i + 1))" "$(known_integration_title "${options[$i]}")"
    else
      printf "\e[32m%s)\e[0m %s\n" "$((i + 1))" "${options[$i]}"
    fi
  done

  printf "\n\e[1;36m?\e[0m \e[1m%s\e[0m \e[2m%s\e[0m" "Continue installation with detected logs?" "[Y/n] (default: Yes): "
  read confirmation_reply
  confirmation_reply="${confirmation_reply:-Y}"

  if [[ ! "$confirmation_reply" =~ ^[Yy](es)?$ ]]; then
    printf "\n\e[1;36m?\e[0m \e[1m%s\e[0m \e[2m%s\e[0m\n" "Exclude logs by listing their index numbers" "(e.g. 1, 2, 3). Press Enter to skip."
    read exclude_index_list_string

    IFS=', ' read -r -a exclude_index_list_array <<<"$exclude_index_list_string"

    for index in "${!options[@]}"; do
      local is_excluded=0
      for excluded_index in "${exclude_index_list_array[@]}"; do
        if [[ "$index" -eq "$((excluded_index - 1))" ]]; then
          is_excluded=1
        fi
      done

      if [[ $is_excluded -eq 0 ]]; then
        if [[ "$index" -lt "${#known_integrations_options[@]}" ]]; then
          selected_known_integrations_array+=("${options[index]}")
        else
          selected_unknown_log_file_pattern_array+=("${options[index]}")
        fi
      else
        if [[ "$index" -lt "${#known_integrations_options[@]}" ]]; then
          excluded_options_string+="$((index + 1))) $(known_integration_title "${options[index]}")\n"
        else
          excluded_options_string+="$((index + 1))) ${options[index]}\n"
        fi
      fi
    done

    if [[ -n "$excluded_options_string" ]]; then
      echo -e "\nThese logs will not be ingested:"
      echo -e "$excluded_options_string"
    fi

    printf "\e[1;36m?\e[0m \e[1m%s\e[0m \e[2m%s\e[0m\n" "List any additional logs you'd like to ingest" "(e.g. /path1/*.log, /path2/*.log). Press Enter to skip."
    read custom_log_file_path_list_string

    IFS=', ' read -r -a custom_log_file_path_list_array <<<"$custom_log_file_path_list_string"

    echo -e "\nYou've selected these logs for ingestion:"
    for item in "${selected_known_integrations_array[@]}"; do
      printf "\e[32m•\e[0m %s\n" "$(known_integration_title "${item}")"
    done
    for item in "${selected_unknown_log_file_pattern_array[@]}" "${custom_log_file_path_list_array[@]}"; do
      printf "\e[32m•\e[0m %s\n" "$item"
    done

    printf "\n\e[1;36m?\e[0m \e[1m%s\e[0m \e[2m%s\e[0m" "Continue installation with selected logs?" "[Y/n] (default: Yes): "
    read confirmation_reply
    confirmation_reply="${confirmation_reply:-Y}"

    if [[ ! "$confirmation_reply" =~ ^[Yy](es)?$ ]]; then
      echo -e "Rerun the script again to select different logs."
      exit 1
    fi
  else
    selected_known_integrations_array=("${known_integrations_options[@]}")
    selected_unknown_log_file_pattern_array=("${unknown_logs_options[@]}")
  fi
}

generate_custom_integration_name() {
  local path_pattern="$1"
  local dir_path
  local name_parts=()
  local name

  dir_path=$(dirname "$path_pattern")
  IFS='/' read -r -a dir_array <<<"$dir_path"

  # Get the last up to 4 parts of the path
  for ((i = ${#dir_array[@]} - 1, count = 0; i >= 0 && count < 4; i--, count++)); do
    name_parts=("${dir_array[$i]}" "${name_parts[@]}")
  done

  # Join the parts into a single string with underscores
  name=$(printf "%s_" "${name_parts[@]}")
  name="${name#_}" # Remove leading underscore
  name="${name%_}" # Remove trailing underscore

  # Replace special characters with underscores
  name="${name// /_}"
  name="${name//-/_}"
  name="${name//./_}"

  echo "$name"
}

printf "\e[1m%s\e[0m\n" "Looking for log files..."
update_step_progress "logs-detect" "loading" "" "{\"os\": \"${os}\", \"arch\": \"${arch}\"}"
detect_known_integrations

# Check if LSOF_PATH is executable
if [ -x "$LSOF_PATH" ]; then
  read_open_log_file_list
  build_unknown_log_file_patterns
else
  update_step_progress "logs-detect" "warning" "lsof is not available on the host"
  echo -e "\nlsof is required to detect custom log files. Looking for known integrations only."
fi

update_step_progress "logs-detect" "complete"
echo -e "\nWe found these logs on your system:"
select_list

backup_elastic_agent_config

printf "\n\e[1m%s\e[0m\n" "Installing Elastic Agent..."
install_integrations
download_elastic_agent
extract_elastic_agent
install_elastic_agent
apply_elastic_agent_config

printf "\n\e[1m%s\e[0m\n" "Waiting for healthy status..."
wait_for_elastic_agent_status
ensure_elastic_agent_healthy

printf "\n\e[32m%s\e[0m\n" "🎉 Elastic Agent is configured and running!"

printf "\n\e[1m%s\e[0m\n" "Next steps:"
printf "\n• %s\n" "Go back to Kibana and check for incoming data"
for path in "${config_files_with_password[@]}"; do
  printf "\n• %s:\n  \e[36m%s\e[0m\n" "Collect $(known_integration_title "$(basename "${path%.yml}")") metrics by adding your username and password to" "$path"
done
printf "\n• %s:\n  \e[36;4m%s\e[0m\n" "For information on other standalone integration setups, visit" "https://www.elastic.co/guide/en/fleet/current/elastic-agent-configuration.html"
