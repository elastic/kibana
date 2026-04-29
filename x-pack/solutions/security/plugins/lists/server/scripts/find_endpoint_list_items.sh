#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

set -e
./check_env_variables.sh

# Optionally, post at least one list item
# ./post_endpoint_list_item.sh ./exception_lists/new/endpoint_list_item.json
#
# Then you can query it as in:
# Example: ./find_endpoint_list_item.sh
#
curl -s -k \
 -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
 -X GET "${KIBANA_URL}${SPACE_URL}/api/endpoint_list/items/_find" | jq .
