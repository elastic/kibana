/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getExampleCode = (rulesetId: string) => `
# Example usage of your synonyms set as a search analyzer
# Create an index with a search analyzer that uses your synonyms set you have created
# https://www.elastic.co/docs/reference/text-analysis/analysis-synonym-tokenfilter#analysis-synonym-configure-sets
PUT my-index
{
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "search_analyzer": "my_analyzer" // Add the analyzer to the field
      }
    }
  },
  "settings": {
    "analysis": {
      "analyzer": {
        "my_analyzer": {
          "tokenizer": "standard",
          "filter": [
            // This is an example on how to configure an analyzer, replace this with the filters you want to use, order is important
            // https://www.elastic.co/docs/reference/text-analysis/analysis-synonym-tokenfilter#analysis-synonym-analizers-configure
            "stemmer",
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

export const getExistingIndexExampleCode = (rulesetId: string) => `
# To use an existing index, you need to close it first. Closing is not available in serverless.
POST my-index/_close

# Example usage of your synonyms set as a search analyzer
# https://www.elastic.co/docs/reference/text-analysis/analysis-synonym-tokenfilter#analysis-synonym-configure-sets
PUT my-index/_settings
{
  "analysis": {
    "analyzer": {
      "my_analyzer": {
        "tokenizer": "standard",
        "filter": [
            // This is an example on how to configure an analyzer, replace this with the filters you want to use, order is important
            // https://www.elastic.co/docs/reference/text-analysis/analysis-synonym-tokenfilter#analysis-synonym-analizers-configure
            "stemmer",
            "synonyms_filter",
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

# Add search analyzer to the index mapping
PUT my-index/_mapping
{
  "properties": {
    "title": {
      "type": "text",
      "search_analyzer": "my_analyzer"
    }
  }
}

# Open the index again
POST my-index/_open
`;
