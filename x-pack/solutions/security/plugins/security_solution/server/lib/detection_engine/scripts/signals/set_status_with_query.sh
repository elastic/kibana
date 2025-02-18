#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

set -e
./check_env_variables.sh

# Example: ./sigsnals/set_status_with_query.sh closed
# Example: ./sigsnals/set_status_with_query.sh open
  curl -s -k \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: 123' \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X POST ${KIBANA_URL}${SPACE_URL}/api/detection_engine/signals/status \
  -d '{
  "status": "'$1'",
  "query": {"range":{"@timestamp":{"gte":"now-2M","lte":"now/M"}}}}' \
  | jq .
