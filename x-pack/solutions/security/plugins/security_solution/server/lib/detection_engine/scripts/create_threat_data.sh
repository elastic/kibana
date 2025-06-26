#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

set -e
./check_env_variables.sh


# Adds port mock data to a threat list for testing.
# Example: ./create_threat_data.sh
# Example: ./create_threat_data.sh 1 500

START=${1:-1}
END=${2:-1000}

for (( i=$START; i<=$END; i++ ))
do {
curl -s -k \
  -H "Content-Type: application/json" \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X PUT ${ELASTICSEARCH_URL}/mock-threat-list-1/_doc/$i \
  --data "
{
   \"@timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",
   \"source\": { \"ip\": \"127.0.0.1\", \"port\": \"${i}\" },
   \"destination\": { \"ip\": \"127.0.0.1\", \"port\": \"${i}\" }
}"
} > /dev/null
done
