#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

set -e
./check_env_variables.sh

# Deletes all data related to rule execution:
# - `siem-detection-engine-rule-execution-info` sidecar saved objects from `.kibana` index
# - fully clears `.kibana-event-log` index

# Example: ./delete_all_rule_execution_data.sh
# https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-delete-by-query.html

curl -s -k \
  -H "Content-Type: application/json" \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X POST ${ELASTICSEARCH_URL}/${KIBANA_INDEX}*/_delete_by_query \
  --data '{
    "query": {
      "exists": { "field": "siem-detection-engine-rule-execution-info" }
    }
  }' \
  | jq .

curl -s -k \
  -H "Content-Type: application/json" \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X POST ${ELASTICSEARCH_URL}/.kibana-event-log*/_delete_by_query \
  --data '{
    "query": {
      "match_all" : {}
    }
  }' \
  | jq .
