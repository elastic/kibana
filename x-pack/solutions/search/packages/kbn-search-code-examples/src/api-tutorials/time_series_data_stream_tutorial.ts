
export const timeSeriesDataStreamTutorialCommands: string = `# Welcome to the tutorial on setting up time series data! 🎉
# 🚀 This tutorial will guide you through setting up timeseries data stream, ingest metrics data and run basic query using API calls from the Kibana dev Console.
# After selecting a command, execute it by clicking the ▶️ button or pressing Ctrl+Enter or Cmd+Enter.
# -----------------------------------------------
# Step 1: Create an index template
# -----------------------------------------------

PUT _index_template/quickstart-tsds-template
{
  "index_patterns": [
    "quickstart-*"
  ],
  "data_stream": {},
  "priority": 100,
  "template": {
    "settings": {
      "index.mode": "time_series"
    },
    "mappings": {
      "properties": {
        "sensor_id": {
          "type": "keyword",
          "time_series_dimension": true
        },
        "location": {
          "type": "keyword",
          "time_series_dimension": true
        },
        "temperature": {
          "type": "half_float",
          "time_series_metric": "gauge"
        },
        "humidity": {
          "type": "half_float",
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
# -----------------------------------------------

PUT quickstart-weather/_bulk
{ "create":{ } }
{ "@timestamp": "2025-09-19T16:59:56.000Z", "sensor_id": "STATION-0001", "location": "base", "temperature": 26.7, "humidity": 49.9 }
{ "create":{ } }
{ "@timestamp": "2025-09-19T16:59:56.000Z", "sensor_id": "STATION-0002", "location": "base", "temperature": 27.2, "humidity": 50.1 }
{ "create":{ } }
{ "@timestamp": "2025-09-19T16:59:56.000Z", "sensor_id": "STATION-0003", "location": "base", "temperature": 28.1, "humidity": 48.7 }
{ "create":{ } }
{ "@timestamp": "2025-09-19T16:59:56.000Z", "sensor_id": "STATION-0004", "location": "satellite", "temperature": 32.4, "humidity": 88.9 }
{ "create":{ } }
{ "@timestamp": "2025-09-19T16:59:56.000Z", "sensor_id": "STATION-0005", "location": "satellite", "temperature": 32.3, "humidity": 87.5 }

# ✅ The response includes a summary of successes and errors for each operation.

# -----------------------------------------------
# Step 3: Run a search query
# -----------------------------------------------
# Note:

POST quickstart-weather/_search
{
  "size": 0,
  "aggs": {
    "by_location": {
      "terms": {
        "field": "location"
      },
      "aggs": {
        "avg_temp_per_hour": {
          "date_histogram": {
            "field": "@timestamp",
            "fixed_interval": "1h"
          },
          "aggs": {
            "avg_temp": {
              "avg": {
                "field": "temperature"
              }
            }
          }
        }
      }
    }
  }
}`
