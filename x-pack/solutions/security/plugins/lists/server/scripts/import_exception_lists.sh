#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

set -e
./check_env_variables.sh

# Uses a defaults if no argument is specified
FILE=${1:-./exception_lists/files/import.ndjson}

# ./import_list_items.sh ip_list ./exception_lists/files/import.ndjson
curl -s -k \
  -X POST "${KIBANA_URL}${SPACE_URL}/api/exception_lists/_import" \
  -H 'kbn-xsrf: true' \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  --form file=@${FILE} \
  | jq .;
