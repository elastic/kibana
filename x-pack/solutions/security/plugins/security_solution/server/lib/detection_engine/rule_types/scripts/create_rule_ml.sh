#!/bin/sh
#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

curl -X POST ${KIBANA_URL}${SPACE_URL}/api/alerts/alert \
     -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
     -H 'kbn-xsrf: true' \
     -H 'Content-Type: application/json' \
     --verbose \
     -d '
{
  "params":{
     "anomalyThreshold": 23,
     "author": [],
     "description": "Basic Machine Learning Rule",
     "exceptionsList": [],
     "falsePositives": [],
     "from": "now-45m",
     "immutable": false,
     "machineLearningJobId": ["test-ml-job"],
     "maxSignals": 101,
     "outputIndex": "",
     "references": [],
     "riskScore": 23,
     "riskScoreMapping": [],
     "ruleId": "1781d055-5c66-4adf-9c59-fc0fa58336a5",
     "severity": "high",
     "severityMapping": [],
     "threat": [],
     "to": "now",
     "type": "machine_learning",
     "version": 1
   },
   "consumer":"alerts",
   "alertTypeId":"siem.mlRule",
   "schedule":{
      "interval":"15m"
   },
   "actions":[],
   "tags":[
      "custom",
      "ml",
      "persistence"
   ],
   "notifyWhen":"onActionGroupChange",
   "name":"Basic Machine Learning Rule"
}'


