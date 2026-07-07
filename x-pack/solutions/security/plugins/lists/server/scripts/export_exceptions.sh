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
LIST_ID=${2:-ips.txt}
L_ID=${1}

echo $LIST_ID
echo $L_ID

# Example to export
# ./export_list_items.sh > /tmp/ips.txt

curl -s -k \
  -H 'kbn-xsrf: 123' \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X POST "${KIBANA_URL}${SPACE_URL}/api/exception_lists/_export?id=${L_ID}&list_id=${LIST_ID}&namespace_type=single"