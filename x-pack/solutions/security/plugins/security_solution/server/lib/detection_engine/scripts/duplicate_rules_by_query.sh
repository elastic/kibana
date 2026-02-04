#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

set -e
./check_env_variables.sh

QUERY=${1}

# Example duplicate all rules
# ./duplicate_rules_by_query.sh

# Example duplicate rules with tag "test"
# ./duplicate_rules_by_query.sh 'alert.attributes.tags: \"test\"'

curl -s -k \
 -H 'Content-Type: application/json' \
 -H 'kbn-xsrf: 123' \
 -H 'elastic-api-version: 2023-10-31' \
 -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
 -X POST ${KIBANA_URL}${SPACE_URL}/api/detection_engine/rules/_bulk_action \
 --data "{
  \"query\": \"$QUERY\",
  \"action\": \"duplicate\"
}" | jq .
