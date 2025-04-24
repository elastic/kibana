/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';

export const QUERY_RULES_SETS_QUERY_KEY = 'query-rules-sets-fetch';
export const CREATE_QUERY_RULE_SET_API_SNIPPET = dedent`# Create or update a query ruleset
PUT /_query_rules/my-ruleset
{
  "rules": [
    {
      "rule_id": "rule1",
      "type": "pinned",
      "criteria": [
        {
          "type": "fuzzy",
          "metadata": "query_string",
          "values": [ "puggles", "pugs" ]
        },
        {
          "type": "exact",
          "metadata": "user_country",
          "values": [ "us" ]
        }
      ],
      "actions": {
        "ids": [
          "id1",
          "id2"
        ]
      }
    },
    {
      "rule_id": "rule2",
      "type": "exclude",
      "criteria": [
        {
          "type": "contains",
          "metadata": "query_string",
          "values": [ "beagles" ]
        }
      ],
      "actions": {
        "docs": [
          {
            "_index": "my-index-000001",
            "_id": "id3"
          },
          {
            "_index": "my-index-000002",
            "_id": "id4"
          }
        ]
      }
    }
  ]
}`;
