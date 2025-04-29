#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

set -e
./check_env_variables.sh

# Example: sh ./timelines/get_timeline_by_template_timeline_id.sh {template_timeline_id}

curl -s -k \
  -H "Content-Type: application/json" \
  -H 'kbn-xsrf: 123' \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X GET "${KIBANA_URL}${SPACE_URL}/api/timeline?template_timeline_id=$1" \
  | jq .
