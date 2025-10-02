/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const timeSeriesDataStreamTutorialCommands: string = `# Welcome to the tutorial on setting up time series data! 🎉
# 🚀 This tutorial will guide you through setting up timeseries data stream, ingest sample data and run a query from the Kibana dev Console.
# After selecting a command, execute it by clicking the ▶️ button or pressing Ctrl+Enter or Cmd+Enter.
# A time series data stream (TSDS) stores timestamped data and one or more metrics data in real time. TSDS helps to store data at regular interval which can then used to real time monitoring.
# -----------------------------------------------
# Step 1: Create an index template
# Requirement in matching index template:
#  * a "data_stream" object
#  * index.mode field set as "time_series"
#  * Atleast one timestamp field with type date
#  * One or more dimension fields
#  * one or more metric fields
# -----------------------------------------------
POST _index_template/kibana_sample_weather_index_template
{
  "index_patterns": [
    "kibana_sample_weather*"
  ],
  "data_stream": {},
  "priority": 100,
  "template": {
    "settings": {
      "index.mode": "time_series"
    },
    "mappings": {
      "properties": {
        "location": {
          "type": "keyword",
          "time_series_dimension": true
        },
        "temperature": {
          "type": "float",
          "time_series_metric": "gauge"
        },
        "@timestamp": {
          "type": "date"
        }
      }
    }
  }
}
# ✅ The response includes a confirmation that the index template is created.

# -----------------------------------------------
# Step 2: Create data stream with data
# Note: You have to adjust the @timestamp field to be close to your current date and time.
# -----------------------------------------------

PUT kibana_sample_weather_data_stream/_bulk
{ "create":{ } }
{ "@timestamp": "2025-10-01T19:53:28.713Z", "location": "base", "temperature": 24.1 }
{ "create":{ } }
{ "@timestamp": "2025-09-11T09:23:28.313Z", "location": "base", "temperature": 34.2}
{ "create":{ } }
{ "@timestamp": "2025-01-05T05:33:18.213Z", "location": "satellite", "temperature": 20.4}

# ✅ The response includes a summary of successes and errors for each operation.

# -----------------------------------------------
# Step 3: Run a search query
# -----------------------------------------------

POST kibana_sample_weather_data_stream/_search
{
  "size": 0,
  "aggs": {
    "by_location": {
      "terms": {
        "field": "location",
        "order":{"_count": "desc"}
      }
    }
  }
}`;
