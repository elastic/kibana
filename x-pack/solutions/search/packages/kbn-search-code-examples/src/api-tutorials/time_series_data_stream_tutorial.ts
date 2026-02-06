/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
const getLatestTimeStamp = (reduceSeconds: number) => {
  return new Date(new Date().getTime() - reduceSeconds).toISOString();
};

export const timeSeriesDataStreamTutorialCommands: string = `# Welcome to the tutorial on setting up time series data! 🎉
# 🚀 This tutorial will guide you through setting up timeseries data stream, ingest sample data and run a query from the Kibana Console.
# After selecting a command, execute it by clicking the ▶️ button or pressing Ctrl+Enter or Cmd+Enter.
# A time series data stream (TSDS) stores timestamped data and one or more metrics data in real time. TSDS helps to store data at regular interval which can then used to real time monitoring.
# -----------------------------------------------
# Step 1: Create an index template
# Requirements in matching index template:
#  * A "data_stream" object
#  * index.mode field set as "time_series"
#  * At least one timestamp field with type date
#  * One or more dimension fields
#  * One or more metric fields
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
       "sensor_id": {
          "type": "keyword",
          "time_series_dimension": true
        },
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
# Step 2: Create data stream with sample weather data
# -----------------------------------------------

PUT kibana_sample_weather_data_stream/_bulk
{ "create":{ } }
{ "@timestamp": \"${getLatestTimeStamp(
  3600000
)}\", "sensor_id":"STATION_1", "location": "base", "temperature": 24.1 }
{ "create":{ } }
{ "@timestamp": \"${getLatestTimeStamp(
  6000
)}\", "sensor_id":"STATION_2", "location": "base", "temperature": 34.2}
 { "create":{ } }
{ "@timestamp": \"${getLatestTimeStamp(
  16000
)}\", "sensor_id":"STATION_2", "location": "satellite", "temperature": 30.2}
{ "create":{ } }
{ "@timestamp": \"${getLatestTimeStamp(
  10000
)}\", "sensor_id":"STATION_3", "location": "satellite", "temperature": 20.4}
 { "create":{ } }
{ "@timestamp": \"${getLatestTimeStamp(
  7000
)}\", "sensor_id":"STATION_4", "location": "base", "temperature": 12.4}
  { "create":{ } }
{ "@timestamp": \"${getLatestTimeStamp(
  17000
)}\", "sensor_id":"STATION_4", "location": "base", "temperature": 44.4}
 { "create":{ } }
{ "@timestamp": \"${getLatestTimeStamp(
  2000
)}\", "sensor_id":"STATION_5", "location": "satellite", "temperature": 32.9}
  { "create":{ } }
{ "@timestamp": \"${getLatestTimeStamp(
  12000
)}\", "sensor_id":"STATION_5", "location": "base", "temperature": 23.5}

# ✅ The response includes a summary of successes and errors for each operation.

# -----------------------------------------------
# Step 3: Run a search query to get latest 5 reading from the last 1 hour, sorted by temperature
# -----------------------------------------------

GET kibana_sample_weather_data_stream/_search
{
  "size": 5,
  "query": {
    "range": {
      "@timestamp": {
        "gte": "now-1h",
        "lte": "now"
    }
    }
  },
  "sort": [
    { "temperature": { "order": "desc" } }
  ]
}
# -----------------------------------------------
# Step 4: Run a search query with aggregations using date histogram to see daily average, min and max temperature for each sensor
# -----------------------------------------------

GET kibana_sample_weather_data_stream/_search
{
  "size": 0,
  "aggs": {
    "by_sensor": {
      "terms": {
        "field": "sensor_id"
      },
      "aggs": {
        "hourly": {
          "date_histogram": {
            "field": "@timestamp",
            "calendar_interval": "1d"
          },
          "aggs": {
            "avg_temp": {
              "avg": {
                "field": "temperature"
              }
            },
            "min_temp": {
              "min": {
                "field": "temperature"
              }
            },
            "max_temp": {
              "max": {
                "field": "temperature"
              }
            }
          }
        }
      }
    }
  }
}
# -----------------------------------------------
# Step 5: Run a search query with aggregations using date histogram to see daily average, min and max temperature for each sensor based on location
# -----------------------------------------------

GET kibana_sample_weather_data_stream/_search
{
  "size": 0,
  "aggs": {
    "by_sensor": {
      "terms": {
        "field": "sensor_id"
      },
      "aggs": {
        "by_location": {
          "terms": {
            "field": "location"
          }
        },
        "hourly": {
          "date_histogram": {
            "field": "@timestamp",
            "calendar_interval": "1d"
          },
          "aggs": {
            "avg_temp": {
              "avg": {
                "field": "temperature"
              }
            },
            "min_temp": {
              "min": {
                "field": "temperature"
              }
            },
            "max_temp": {
              "max": {
                "field": "temperature"
              }
            }
          }
        }
      }
    }
  }
}

# -----------------------------------------------
# Step 6: Lets create a pipeline aggregation with moving function on the aggregated buckets to execute custom script on each window of data.
# Below query shows top 3 sensors and then splits them into hourly bucket of intervals, calculates average temperature per hour and then computes moving sum of last 3 hourly averages
# -----------------------------------------------
GET kibana_sample_weather_data_stream/_search
{
  "size": 0,
  "aggs": {
    "by_sensor": {
      "terms": {
        "field": "sensor_id",
        "size": 3
      },
      "aggs": {
        "hourly": {
          "date_histogram": {
            "field": "@timestamp",
            "calendar_interval": "1h"
          },
          "aggs": {
            "avg_temp": {
              "avg": {
                "field": "temperature"
              }
            },
            "moving_avg_temp": {
              "moving_fn": {
                "buckets_path": "avg_temp",
                "window": 3,
                "script": "MovingFunctions.sum(values)"
              }
            }
          }
        }
      }
    }
  }
}
# -----------------------------------------------
# Step 7: You can now use the data stream that you created in this tutorial to create some dashboards and visualize the sample weather data in kibana using Lens.
# To learn more about how to create dashboard using Lens, visit https://www.elastic.co/docs/explore-analyze/visualize/lens
# If you would like to delete the data stream and index template created as part of this tutorial, please follow steps from step 8.
# Alternatively, you could delete via the index management page.
# ---------------------------------------------------

# Step 8: Delete data stream and index template that was created as part of this tutorial
# Since index template is used by the data stream, we need to delete the data stream first before index template.
# -----------------------------------------------
DELETE _data_stream/kibana_sample_weather_data_stream

# ✅ The response includes a confirmation that the data stream is deleted.

DELETE _index_template/kibana_sample_weather_index_template

# ✅ The response includes a confirmation that the index template is deleted.

# -----------------------------------------------
# 🎉 Conclusion
# -----------------------------------------------
# 🏁 In this tutorial, you learned how to set up a time series data stream(TSDS) in Elasticsearch.
# To learn more about TSDS, visit https://www.elastic.co/docs/manage-data/data-store/data-streams/time-series-data-stream-tsds
# To learn more about Aggregations, visit https://www.elastic.co/docs/explore-analyze/query-filter/aggregations
`;
