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
FILTER=${2:-'exception-list.attributes.name:%20Sample%20Endpoint%20Exception%20List'}
NAMESPACE_TYPE=${3-single}

# The %20 is just an encoded space that is typical of URL's.
# The %22 is just an encoded quote of "
# Table of them for testing if needed: https://www.w3schools.com/tags/ref_urlencode.asp

# First, post two different lists and two list items for the example to work
# ./post_exception_list.sh ./exception_lists/new/exception_list.json
# ./post_exception_list_item.sh ./exception_lists/new/exception_list_item.json
#
# ./post_exception_list.sh ./exception_lists/new/exception_list_agnostic.json
# ./post_exception_list_item.sh ./exception_lists/new/exception_list_item_agnostic.json

# Example: ./find_exception_list_items_by_filter.sh simple_list exception-list.attributes.name:%20Sample%20Endpoint%20Exception%20List
# Example: ./find_exception_list_items_by_filter.sh simple_list exception-list.attributes.name:%20Sample%20Endpoint%20Exception%20List single
# Example: ./find_exception_list_items_by_filter.sh endpoint_list exception-list-agnostic.attributes.name:%20Sample%20Endpoint%20Exception%20List agnostic
#
# Example: ./find_exception_list_items_by_filter.sh simple_list exception-list.attributes.entries.field:actingProcess.file.signer
# Example: ./find_exception_list_items_by_filter.sh simple_list "exception-list.attributes.entries.field:actingProcess.file.signe*"
# Example: ./find_exception_list_items_by_filter.sh simple_list "exception-list.attributes.entries.field:actingProcess.file.signe*%20AND%20exception-list.attributes.entries.field:actingProcess.file.signe*"
#
# Example with multiplie lists, and multiple filters
# Example: ./find_exception_list_items_by_filter.sh simple_list,endpoint_list "exception-list.attributes.name:%20Sample%20Endpoint%20Exception%20List,exception-list-agnostic.attributes.name:%20Sample%20Endpoint%20Exception%20List" single,agnostic
curl -s -k \
 -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
 -X GET "${KIBANA_URL}${SPACE_URL}/api/exception_lists/items/_find?list_id=${LIST_ID}&filter=${FILTER}&namespace_type=${NAMESPACE_TYPE}" | jq .
