#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

set -e
./check_env_variables.sh

# Example: ./find_alerting_rules.sh
# https://www.elastic.co/docs/api/doc/kibana/v8/operation/operation-findrules
# Related: use ./find_rules.sh to retrieve Detection Engine (Security) rules
curl -s -k \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X GET ${KIBANA_URL}${SPACE_URL}/api/alerting/rules/_find \
  | jq .
