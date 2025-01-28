#!/bin/sh
#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.
#

# to see alerts with this script
# 1. enable filebeat threatintel module and run filebeat
# 2. using Kibana DevTools, create `test-index` with the following mappings: @timestamp:date, file.hash.md5:text
# 3. run this script
# 4. using Kibana DevTools, post to test-index an existing file.hash.md5 value with a current timestamp
# 5. alert should be generated and can be viewed on the Alerts table

curl -X POST ${KIBANA_URL}${SPACE_URL}/api/alerts/alert \
     -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
     -H 'kbn-xsrf: true' \
     -H 'Content-Type: application/json' \
     --verbose \
     -d '
{
  "params":{
     "author": [],
     "description": "Indicator Match Rule",
     "exceptionsList": [],
     "falsePositives": [],
     "from": "now-300s",
     "query": "*:*",
     "immutable": false,
     "index": ["test-*"],
     "language": "kuery",
     "maxSignals": 10,
     "outputIndex": "",
     "references": [],
     "riskScore": 21,
     "riskScoreMapping": [],
     "ruleId": "81dec1ba-b779-469c-9667-6b0e865fb86c",
     "severity": "low",
     "severityMapping": [],
     "threat": [],
     "threatQuery": "*:*",
     "threatMapping": [
        {
          "entries":[
            {
              "field":"file.hash.md5",
              "type":"mapping",
              "value":"threat.indicator.file.hash.md5"
            }
          ]
        }
     ],
     "threatLanguage": "kuery",
     "threatIndex": ["filebeat-*"],
     "to": "now",
     "type": "threat_match",
     "version": 1
   },
   "consumer":"alerts",
   "alertTypeId":"siem.indicatorRule",
   "schedule":{
      "interval":"1m"
   },
   "actions":[],
   "tags":[
      "indicator match",
      "persistence"
   ],
   "notifyWhen":"onActionGroupChange",
   "name":"Basic Indicator Match Rule"
}'
