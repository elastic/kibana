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
FOLDER=${1:-/tmp}

# Example to export
# ./export_list_items_to_file.sh

# Change current working directory as exports cause Kibana to restart
pushd ${FOLDER} > /dev/null

curl -s -k -OJ \
  -H 'kbn-xsrf: 123' \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X POST "${KIBANA_URL}${SPACE_URL}/api/lists/items/_export?list_id=ip_list"

popd > /dev/null
