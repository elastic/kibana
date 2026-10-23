/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const promqlTutorialCommands = `# Welcome to the Elasticsearch PromQL Tutorial! 🔥
#
# In this tutorial, we walk through ingesting sample Prometheus metrics and querying them using PromQL.
#
#
# -----------------------------------------------
# Step 1: Add sample Prometheus metrics
# -----------------------------------------------
#
# In this tutorial we will use an example counter metric \`requests_total\` that tracks HTTP requests.
# We can ingest test samples using universal Bulk API or native Remote Write (see Next steps).

# Run: select a command to execute it by clicking the ▶️ button or Ctrl(Cmd)+Enter.

PUT /metrics-generic.prometheus-default/_bulk
{ "create": {} }
{"@timestamp":"2026-10-22T12:05:49Z","data_stream":{"type":"metrics","dataset":"generic.prometheus","namespace":"default"},"labels":{"__name__":"requests_total","job":"tutorial","instance":"us-east-1"},"metrics":{"requests_total":170}}
{ "create": {} }
{"@timestamp":"2026-10-22T12:05:49Z","data_stream":{"type":"metrics","dataset":"generic.prometheus","namespace":"default"},"labels":{"__name__":"requests_total","job":"tutorial","instance":"us-west-1"},"metrics":{"requests_total":80}}
{ "create": {} }
{"@timestamp":"2026-10-22T12:06:49Z","data_stream":{"type":"metrics","dataset":"generic.prometheus","namespace":"default"},"labels":{"__name__":"requests_total","job":"tutorial","instance":"us-east-1"},"metrics":{"requests_total":177}}
{ "create": {} }
{"@timestamp":"2026-10-22T12:04:49Z","data_stream":{"type":"metrics","dataset":"generic.prometheus","namespace":"default"},"labels":{"__name__":"requests_total","job":"tutorial","instance":"us-east-1"},"metrics":{"requests_total":163}}
{ "create": {} }
{"@timestamp":"2026-10-22T12:04:49Z","data_stream":{"type":"metrics","dataset":"generic.prometheus","namespace":"default"},"labels":{"__name__":"requests_total","job":"tutorial","instance":"us-west-1"},"metrics":{"requests_total":77}}
{ "create": {} }
{"@timestamp":"2026-10-22T12:06:49Z","data_stream":{"type":"metrics","dataset":"generic.prometheus","namespace":"default"},"labels":{"__name__":"requests_total","job":"tutorial","instance":"us-west-1"},"metrics":{"requests_total":83}}

# ✅ The response includes acknowledgment of created documents.


# -----------------------------------------------
# Step 2: Run basic PromQL queries 🔍
# -----------------------------------------------
#
# Elasticsearch exposes a Prometheus-compatible HTTP API
# for executing PromQL against stored metrics.
#
# Start with an instant query to retrieve the latest value
# of requests_total for each instance.

# Run: select a command to execute it by clicking the ▶️ button or Ctrl(Cmd)+Enter.

GET /_prometheus/api/v1/query?query=requests_total&time=1792670839

# ✅ The response includes resultType "vector", containing two series.
# Each series includes its labels and latest counter value.
#
# Use label matchers to select specific series.

# Run: select a command to execute it by clicking the ▶️ button or Ctrl(Cmd)+Enter.

GET /_prometheus/api/v1/query?query=requests_total{instance="us-east-1"}&time=1792670839

# ✅ The response includes one series, instance="us-east-1".
#
# Aggregate values across instances using sum().

# Run: select a command to execute it by clicking the ▶️ button or Ctrl(Cmd)+Enter.

GET /_prometheus/api/v1/query?query=sum by(job)(requests_total)&time=1792670839

# ✅ The response includes one series with job="tutorial".
#
# Use topk() to select the instance with the highest count.

# Run: select a command to execute it by clicking the ▶️ button or Ctrl(Cmd)+Enter.

GET /_prometheus/api/v1/query?query=topk(1,requests_total)&time=1792670839

# ✅ The response includes one series, instance="us-east-1".


# Run: select a command to execute it by clicking the ▶️ button or Ctrl(Cmd)+Enter.

GET /_prometheus/api/v1/query?query=sum(rate(requests_total[5m]))&time=1792670839

# ✅ The response shows approximately ratio of requests per second


# -----------------------------------------------
# Step 3: Advanced processing of PromQL results using ES|QL
# -----------------------------------------------
#
# PromQL can also be executed as an ES|QL source command.
#
# Unlike the HTTP API, which returns Prometheus-compatible JSON, the PROMQL command produces tabular results that can be processed with standard ES|QL operations.

# For example, the following query calculates the request rate every minute for the last 5 minutes:

# Run: select a command to execute it by clicking the ▶️ button or Ctrl(Cmd)+Enter.

POST /_query?format=txt
{
  "query": """
    PROMQL index=metrics-generic.prometheus-default start=1792670119 end=1792670839 step=60s
      http_rate=(sum(rate(requests_total[5m])))
    """
}

# ✅ The response includes a table with http_rate and step columns.

# Now let's extend the same query using ES|QL by filtering out results with low rates and calculating average and peak:

# Run: select a command to execute it by clicking the ▶️ button or Ctrl(Cmd)+Enter.

POST /_query
{
  "query": """
    PROMQL index=metrics-generic.prometheus-default start=1792670119 end=1792670839 step=60s
      http_rate=(sum(rate(requests_total[5m])))
    | WHERE http_rate > 0.05
    | STATS avg_rate = AVG(http_rate), peak_rate = MAX(http_rate)
  """
}

# ✅ The response shows one row with avg_rate and peak_rate.


# -----------------------------------------------
# Next steps: Connect Prometheus using remote write
# -----------------------------------------------
#
# You've ingested Prometheus-compatible metrics, queried them using PromQL, and processed the results with ES|QL. To ingest metrics continuously, configure Prometheus to send samples directly to Elasticsearch using remote write.
#
# Add the following to your prometheus.yml file, replacing
# <es-endpoint> and <api-key> with your credentials.
#
# This is a configuration example, not a Console request.
# The API key requires write access to the target data stream.
#
# remote_write:
#   - url: "https://<es-endpoint>/_prometheus/api/v1/write"
#     authorization:
#       type: ApiKey
#       credentials: "<api-key>"
#
# By default, metrics are stored in:
#   metrics-generic.prometheus-default
#
# You can specify a custom dataset in the endpoint:
#
# remote_write:
#   - url: "https://<es-endpoint>/_prometheus/metrics/tutorial/api/v1/write"
#     authorization:
#       type: ApiKey
#       credentials: "<api-key>"
#
# This writes to metrics-tutorial.prometheus-default.
#
# Learn more about Prometheus and PromQL in Elasticsearch:
#
# PromQL:
# [https://www.elastic.co/docs/reference/query-languages/promql](https://www.elastic.co/docs/reference/query-languages/promql)
#
# PromQL HTTP API:
# [https://www.elastic.co/docs/reference/query-languages/promql/promql-http-api](https://www.elastic.co/docs/reference/query-languages/promql/promql-http-api)
#
# ES|QL PROMQL command:
# [https://www.elastic.co/docs/reference/query-languages/esql/commands/promql](https://www.elastic.co/docs/reference/query-languages/esql/commands/promql)
#
# Prometheus remote write:
# [https://www.elastic.co/docs/manage-data/data-store/data-streams/tsds-ingest-prometheus-remote-write](https://www.elastic.co/docs/manage-data/data-store/data-streams/tsds-ingest-prometheus-remote-write)
#
# Query Elasticsearch with Grafana:
# [https://www.elastic.co/docs/reference/query-languages/promql/promql-grafana](https://www.elastic.co/docs/reference/query-languages/promql/promql-grafana)
#`;
