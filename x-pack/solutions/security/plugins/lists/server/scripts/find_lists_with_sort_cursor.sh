#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

set -e
./check_env_variables.sh

PAGE=${1-1}
PER_PAGE=${2-20}
SORT_FIELD=${3-name}
SORT_ORDER=${4-asc}
CURSOR=${5-invalid}

# Example: ./find_lists_with_sort_cursor.sh 1 20 name asc <cursor>
curl -s -k \
 -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
 -X GET "${KIBANA_URL}${SPACE_URL}/api/lists/_find?page=${PAGE}&per_page=${PER_PAGE}&sort_field=${SORT_FIELD}&sort_order=${SORT_ORDER}&cursor=${CURSOR}" | jq .
