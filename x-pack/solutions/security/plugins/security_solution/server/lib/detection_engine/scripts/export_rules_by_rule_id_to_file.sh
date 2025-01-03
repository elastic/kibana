#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

set -e
./check_env_variables.sh

# Uses a defaults if no arguments are specified
RULES=${1:-./rules/export/ruleid_queries.json}
FILENAME=${2:-test.ndjson}
EXCLUDE_DETAILS=${3:-false}

# Example export to the file named test.ndjson
# ./export_rules_by_rule_id_to_file.sh

# Example export to the file named test.ndjson with export details appended
# ./export_rules_by_rule_id_to_file.sh ./rules/export/ruleid_queries.json test.ndjson false
curl -s -k -OJ \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: 123' \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X POST "${KIBANA_URL}${SPACE_URL}/api/detection_engine/rules/_export?exclude_export_details=${EXCLUDE_DETAILS}&file_name=${FILENAME}" \
  -d @${RULES}
