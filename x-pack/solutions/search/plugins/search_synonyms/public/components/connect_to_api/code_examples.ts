/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getExampleCode = (rulesetId: string) => `
PUT my-index
{
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "search_analyzer": "my_analyzer"
      }
    }
  },
  "settings": {
    "analysis": {
      "analyzer": {
        "my_analyzer": {
          "tokenizer": "whitespace",
          "filter": [
            "synonyms_filter"
          ]
        }
      },
      "filter": {
        "synonyms_filter": {
          "type": "synonym",
          "synonyms_set": "${rulesetId}",
          "updateable": true
        }
      }
    }
  }
}`;
