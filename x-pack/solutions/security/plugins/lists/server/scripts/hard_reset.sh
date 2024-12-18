#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

set -e
./check_env_variables.sh

# re-create the list and list item indexes
./delete_list_index.sh
./post_list_index.sh

# re-create the exception list and exception list items
./delete_all_exception_lists.sh
