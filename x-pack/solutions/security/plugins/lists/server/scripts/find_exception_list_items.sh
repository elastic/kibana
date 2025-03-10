#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

set -e
./check_env_variables.sh

LIST_ID=${1:-simple_list}
NAMESPACE_TYPE=${2-single}

# First, post two different lists and two list items for the example to work
# ./post_exception_list.sh ./exception_lists/new/exception_list.json
# ./post_exception_list_item.sh ./exception_lists/new/exception_list_item.json
#
# ./post_exception_list.sh ./exception_lists/new/exception_list_agnostic.json
# ./post_exception_list_item.sh ./exception_lists/new/exception_list_item_agnostic.json

# Querying a single list item aginst each type
# Example: ./find_exception_list_items.sh simple_list
# Example: ./find_exception_list_items.sh simple_list single
# Example: ./find_exception_list_items.sh endpoint_list agnostic
#
# Finding multiple list id's across multiple spaces
# Example: ./find_exception_list_items.sh simple_list,endpoint_list single,agnostic
curl -s -k \
 -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
 -X GET "${KIBANA_URL}${SPACE_URL}/api/exception_lists/items/_find?list_id=${LIST_ID}&namespace_type=${NAMESPACE_TYPE}" | jq .
