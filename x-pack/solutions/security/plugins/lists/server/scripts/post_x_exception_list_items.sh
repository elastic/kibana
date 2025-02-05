#!/bin/bash

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

set -e
./check_env_variables.sh

LIST_ID=${1:-simple_list}
COUNT=${2:-100}
LIST_FILE=${3:-exception_lists/new/exception_list_item.json}

# You can get the first exception list_id like so:
# ./find_exception_lists.sh | jq '.data[0].list_id'

# Example useage
# ./post_x_exception_list_items.sh
# ./post_x_exception_list_items.sh 5886f4dd-84e5-441b-a7d7-0712f072f9d1 100

cat ${LIST_FILE} | jq --arg LIST_ID "$LIST_ID" '.list_id = $LIST_ID' > $TMPDIR/file_to_post.json

for i in $(seq 1 $COUNT); do
  ITEM_ID=`cat /dev/urandom | base64 | tr -dc '0-9a-zA-Z' | head -c100`
  cat ${LIST_FILE} | jq --arg LIST_ID "$LIST_ID" --arg ITEM_ID "$ITEM_ID" '.list_id = $LIST_ID | .item_id = $ITEM_ID' > $TMPDIR/file_to_post_${ITEM_ID}.json
  ./post_exception_list_item.sh $TMPDIR/file_to_post_${ITEM_ID}.json &
done
