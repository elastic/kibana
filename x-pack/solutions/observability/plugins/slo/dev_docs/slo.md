# SLO

Starting in 8.8, SLO is enabled by default. SLO is GA since 8.12


## Development & testing

1. Data generation

> [!TIP]
> The following commands uses [kbn-data-forge](../../../../../platform/packages/shared/kbn-data-forge/README.md) to generate some data for developping or testing SLOs

Basic command to generate 7 days of data with a couple of services:
```sh
node x-pack/scripts/data_forge.js \
	--events-per-cycle 100 \
	--lookback now-7d  \
	--dataset fake_stack \
	--install-kibana-assets \
	--kibana-url http://localhost:5601/kibana
```

Command to generate data for 7 days, including some ephemeral project ids. This is useful for working on the groupBy feature:
```sh
node x-pack/scripts/data_forge.js \
	--events-per-cycle 50 \
	--lookback now-7d \
	--ephemeral-project-ids 10 \
	--dataset fake_stack \
	--install-kibana-assets \
	--kibana-url http://localhost:5601/kibana
```

Get help with the data forge tool: `node x-pack/scripts/data_forge.js --help`

2. Create SLOs

> [!TIP]
> Using the API is possible, but to prevent this document of becoming out of date, we refer to the [openAPI](../docs/openapi/slo/bundled.yaml) specification instead.
> Using the UI for developping/testing is the simpler approach.


Start your kibana instance as usual, and open [kibana](http://localhost:5601/kibana/app/observability/slos). You might need to use the correct base path for your setup.
On this page, you'll be able to create SLOs.


> [!WARNING]
> Wait for the data to be fully generated (it can take a few minutes to a couple of hours depending of the settings you use).
> Inspect the created Kibana dashboards to know when the lookback period is generated.


With the data generated from the above section, the easiest SLO you can setup would be:

> **Type**: Custom Query
>
> **Index**: Admin Console
>
> **Good** (query): `http.response.status_code < 500`
>
> **Total** (query): `http.response.status_code : *`
>
> **Group By** (optional): `url.domain` or `host.name` or `none`


3. Smoke testing

Testing the following screens should be enough:

- Create SLO form
- Edit SLO form
- Clone SLO form
- SLO List page
  - Sort SLO action
  - Group SLO action
  - Pagination List
  - Delete SLO modal
  - Reset SLO modal
  - Check other actions as well
- SLO Details page
  - View SLO details charts
  - View SLO history charts
  - View SLO related alerts tab
  - Create SLO burn rate rule
  - Update SLO burn rate rule


## Supported SLI

We currently support the following SLI:

- APM Transaction Error Rate, known as APM Availability
- APM Transaction Duration, known as APM Latency
- Custom Query
- Custom Metric
- Histogram Metric
- Timeslice Metric
- Synthetics

For the **APM** SLIs, customer can provide the service, environment, transaction name and type to configure them. For the **APM Latency** SLI, a threshold in milliseconds needs to be provided to discriminate the good and bad responses (events). For the **APM Availability** SLI, we use the `event.outcome` as a way to discriminate the good and the bad responses(events). The API supports an optional kql filter to further filter the apm data.

The **Custom Query** SLI requires an index pattern, an optional filter query, a numerator query, and denominator query. A custom `timestampField` can be provided to override the default @timestamp field.

The **Custom Metric** SLI requires an index pattern, an optional filter query, a set of metrics for the numerator, and a set of metrics for the denominator. A custom `timestampField` can be provided to override the default @timestamp field.

The **Histogram Metric** SLI requires an index pattern, an optional filter query, and an optional `timestampField`. `good` represents the numerator and `total` represents the denominator, and both require the following fields:

* field - the histogram field used to aggregate good/total events.
* aggregation - type of aggregation to use, limited to `value_count` or `range`.
* from - if the `range` aggregation is used, this defines the starting value of the range.
* to - if the `range` aggregation is used, this defines the ending value of the range.


## SLO configuration

### Time window

We support **calendar aligned** and **rolling** time windows.

**Rolling time window:** Limited to 7d, 30d or 90d and `type: rolling`. SLOs defined with such time window, will only considere the SLI data from the last duration period as a moving window.

**Calendar aligned time window:** Requires a duration, limited to `1M` for monthly or `1w` for weekly, and `type: calendarAligned`.

### Budgeting method

An SLO can be configured with an **occurrences** or **timeslices** budgeting method.

An **occurrences** budgeting method uses the number of **good** and **total** events during the time window.

A **timeslices** budgeting method uses the number of **good slices** and **total slices** during the time window. A slice is an arbitrary time window (smaller than the overall SLO time window) that is either considered good or bad, calculated from the timeslice threshold and the ratio of good over total events that happened during the slice window.

For example, defining a **timeslices** budgeting method with a `95%` slice threshold and `5m` slice window means that a 1 week SLO is split in 2,016 slices (`7*24*60 / 5`); for a 99% SLO target there will be approximately 20 minutes of available error budget. Each bucket is either good or bad depending on the ratio of good over total events during that bucket, compared to the slice threshold of 95%.

### Objective

The target objective is the value the SLO needs to meet during the time window.
If a **timeslices** budgeting method is used, we also need to define the **timesliceTarget** which can be different than the overall SLO target.

### Optional settings

The default settings should be sufficient for most users, but if needed, the following properties can be overwritten:

- **syncDelay**: The ingest delay in the source data, defaults to `1m`
- **frequency**: How often do we query the source data, defaults to `1m`
- **preventInitialBackfill**: A boolean preventing the backfill of the entire lookback window defined on the SLO. Useful for performance reason.
- **syncField**: The field to use for syncing the source data with the transform. Default to the sli timestampField. It is highly recommended to use an `event.ingested` or similar field.

## SLI data routing and retention

### Routing pipeline

Each SLO rollup transform writes to the base SLI index (`.slo-observability.sli-v3.6`) through its own SLI ingest pipeline (`.slo-observability.sli.pipeline-{sloId}-{revision}`). That pipeline calls a shared routing pipeline, one per resources version (`.slo-observability.sli.routing-v3.6`), which routes each document to a time-based index named after its `@timestamp`: `.slo-observability.sli-v3.6.YYYY-MM-DD`.

The routing pipeline is managed by Kibana: the resource installer creates it on startup and the `slo:resources-reconcile-task` task re-installs it every hour when it is missing or outdated. Its `_meta.routing` holds the routing state:

- `rounding`: the index rounding (`M` monthly, `w` weekly or `d` daily).
- `cutover`: a cutover guard, or `null`. Documents with a `@timestamp` before `cutover` (epoch millis, the first day of a UTC month) keep the daily rounding of the indices written before the routing pipeline existed, so a rollup bucket rewritten later lands in the same index as the original document. It is set only when daily indices exist and the rounding is not `d`.

The routing state is set once, when the routing pipeline of a resources version is created, and is never changed afterwards.

The `slo:resources-reconcile-task` task also migrates the SLI pipelines created before the routing pipeline existed: it replaces their `date_index_name` processor with a call to the routing pipeline of their version.

### Index rounding

`xpack.slo.sliIndexRounding` (`M`, `w` or `d`, defaults to `M`) sets the rounding of the SLI indices. Clusters with a large SLI volume can use `d` or `w` to keep each index small. The setting is read when the routing pipeline of a resources version is created: a later change is not applied to the existing routing pipeline (Kibana logs a warning) and takes effect with the next resources version. Changing the rounding of an existing routing pipeline would route a rewritten rollup bucket to a different index than the original document and double count it.

### Retention

The `slo:sli-retention-task` task runs daily and deletes, for every `v3.x` version:

- dated SLI indices whose period ended before the retention period (`xpack.slo.sliRetentionPeriod`, defaults to `180d`, minimum `91d`),
- empty dated SLI indices whose period ended more than 91 days ago,
- empty base SLI indices of previous versions that no SLO transform writes to.

The rounding of an index cannot be told from its name, so a day `01` index is kept one month after its date, and any other index 7 days after its date. Set `xpack.slo.sliRetentionTaskEnabled: false` to keep SLI data forever. A retention period shorter than 180 days truncates the history charts of 90 days SLOs.

### Troubleshooting

```
GET _ingest/pipeline/.slo-observability.sli.routing-v3.6
GET _cat/indices/.slo-observability.sli-v3*?expand_wildcards=all&s=index
```

## Example

### Availability

<details>
<summary>99% availability for GET /api over the last 30 days</summary>

```
curl --request POST \
  --url http://localhost:5601/cyp/api/observability/slos \
  --header 'Authorization: Basic ZWxhc3RpYzpjaGFuZ2VtZQ==' \
  --header 'Content-Type: application/json' \
  --header 'kbn-xsrf: oui' \
  --data '{
	"name": "My SLO Name",
	"description": "My SLO Description",
	"indicator": {
		"type": "sli.apm.transactionErrorRate",
		"params": {
			"environment": "production",
			"service": "o11y-app",
			"transactionType": "request",
			"transactionName": "GET /api",
			"index": "metrics-apm*"
		}
	},
	"timeWindow": {
		"duration": "30d",
		"type": "rolling"
	},
	"budgetingMethod": "occurrences",
	"objective": {
		"target": 0.99
	}
}'
```

</details>

<details>
<summary>95% availability for GET /api monthly aligned</summary>

```
curl --request POST \
  --url http://localhost:5601/cyp/api/observability/slos \
  --header 'Authorization: Basic ZWxhc3RpYzpjaGFuZ2VtZQ==' \
  --header 'Content-Type: application/json' \
  --header 'kbn-xsrf: oui' \
  --data '{
	"name": "My SLO Name",
	"description": "My SLO Description",
	"indicator": {
		"type": "sli.apm.transactionErrorRate",
		"params": {
			"environment": "production",
			"service": "o11y-app",
			"transactionType": "request",
			"transactionName": "GET /api",
			"index": "metrics-apm*"
		}
	},
	"timeWindow": {
		"duration": "1M",
		"type": "calendarAligned"
	},
	"budgetingMethod": "occurrences",
	"objective": {
		"target": 0.95
	}
}'
```

</details>

<details>
<summary>90% availability for GET /api over the last week (5m timeslices)</summary>

```
curl --request POST \
  --url http://localhost:5601/cyp/api/observability/slos \
  --header 'Authorization: Basic ZWxhc3RpYzpjaGFuZ2VtZQ==' \
  --header 'Content-Type: application/json' \
  --header 'kbn-xsrf: oui' \
  --data '{
	"name": "My SLO Name",
	"description": "My SLO Description",
	"indicator": {
		"type": "sli.apm.transactionErrorRate",
		"params": {
            "environment": "production",
			"service": "o11y-app",
			"transactionType": "request",
			"transactionName": "GET /api",
			"index": "metrics-apm*"
		}
	},
	"timeWindow": {
		"duration": "7d",
		"type": "rolling"
	},
	"budgetingMethod": "timeslices",
	"objective": {
		"target": 0.90,
		"timesliceTarget": 0.86,
		"timesliceWindow": "5m"
	}
}'
```

</details>

### Latency

<details>
<summary>99% of GET /api under 500ms over the last week</summary>

```
curl --request POST \
  --url http://localhost:5601/cyp/api/observability/slos \
  --header 'Authorization: Basic ZWxhc3RpYzpjaGFuZ2VtZQ==' \
  --header 'Content-Type: application/json' \
  --header 'kbn-xsrf: oui' \
  --data '{
	"name": "My SLO Name",
	"description": "My SLO Description",
	"indicator": {
		"type": "sli.apm.transactionDuration",
		"params": {
			"environment": "production",
			"service": "o11y-app",
			"transactionType": "request",
			"transactionName": "GET /api",
			"threshold": 500,
			"index": "metrics-apm*"
		}
	},
	"timeWindow": {
		"duration": "7d",
		"type": "rolling"
	},
	"budgetingMethod": "occurrences",
	"objective": {
		"target": 0.99
	}
}'
```

</details>

<details>
<summary>95% of GET /api under 500ms over the last week (1m timeslices)</summary>

```
curl --request POST \
  --url http://localhost:5601/cyp/api/observability/slos \
  --header 'Authorization: Basic ZWxhc3RpYzpjaGFuZ2VtZQ==' \
  --header 'Content-Type: application/json' \
  --header 'kbn-xsrf: oui' \
  --data '{
	"name": "My SLO Name",
	"description": "My SLO Description",
	"indicator": {
		"type": "sli.apm.transactionDuration",
		"params": {
			"environment": "production",
			"service": "o11y-app",
			"transactionType": "request",
			"transactionName": "GET /api",
			"threshold": 500,
			"index": "metrics-apm*"
		}
	},
	"timeWindow": {
		"duration": "7d",
		"type": "rolling"
	},
	"budgetingMethod": "timeslices",
	"objective": {
		"target": 0.95,
		"timesliceTarget": 0.90,
		"timesliceWindow": "1m"
	}
}'
```

</details>

<details>
<summary>99.9% of GET /api under 500ms weekly aligned (5m timeslices)</summary>

```
curl --request POST \
  --url http://localhost:5601/cyp/api/observability/slos \
  --header 'Authorization: Basic ZWxhc3RpYzpjaGFuZ2VtZQ==' \
  --header 'Content-Type: application/json' \
  --header 'kbn-xsrf: oui' \
  --data '{
	"name": "My SLO Name",
	"description": "My SLO Description",
	"indicator": {
		"type": "sli.apm.transactionDuration",
		"params": {
			"environment": "production",
			"service": "o11y-app",
			"transactionType": "request",
			"transactionName": "GET /api",
			"threshold": 500,
			"index": "metrics-apm*"
		}
	},
	"timeWindow": {
		"duration": "1w",
		"type": "calendarAligned"
	},
	"budgetingMethod": "timeslices",
	"objective": {
		"target": 0.999,
		"timesliceTarget": 0.95,
		"timesliceWindow": "5m"
	}
}'
```

</details>

### Custom Query

<details>
<summary>98.5% of 'logs lantency < 300ms' for 'groupId: group-0' over the last 7 days</summary>

```
curl --request POST \
  --url http://localhost:5601/cyp/api/observability/slos \
  --header 'Authorization: Basic ZWxhc3RpYzpjaGFuZ2VtZQ==' \
  --header 'Content-Type: application/json' \
  --header 'kbn-xsrf: oui' \
  --data '{
	"name": "My SLO Name",
	"description": "My SLO Description",
	"indicator": {
		"type": "sli.kql.custom",
		"params": {
			"index": "high-cardinality-data-fake_logs*",
			"good": "latency < 300",
			"total": "",
			"filter": "labels.groupId: group-0",
			"timestampField": "custom_timestamp"
		}
	},
	"timeWindow": {
		"duration": "7d",
		"type": "rolling"
	},
	"budgetingMethod": "occurrences",
	"objective": {
		"target": 0.985
	}
}'
```

</details>

### Custom Metric

<details>
<summary>95.0% of events are processed over the last 7 days</summary>

```
curl --request POST \
  --url http://localhost:5601/cyp/api/observability/slos \
  --header 'Authorization: Basic ZWxhc3RpYzpjaGFuZ2VtZQ==' \
  --header 'Content-Type: application/json' \
  --header 'kbn-xsrf: oui' \
  --data '{
	"name": "My SLO Name",
	"description": "My SLO Description",
	"indicator": {
		"type": "sli.metric.custom",
		"params": {
			"index": "high-cardinality-data-fake_stack.message_processor-*",
      "good": {
        "metrics": [
          {
            "name": "A",
            "aggregation": "sum",
            "field": "processor.processed"
          }
        ],
        "equation": "A"
      },
			"total": {
        "metrics": [
          {
            "name": "A",
            "aggregation": "sum",
            "field": "processor.accepted"
          }
        ],
        "equation": "A"
      },
			"filter": "",
			"timestampField": "@timestamp"
		}
	},
	"timeWindow": {
		"duration": "7d",
		"type": "rolling"
	},
	"budgetingMethod": "occurrences",
	"objective": {
		"target": 0.95
	}
}'
```

</details>

### Custom Histogram

<details>
<summary>95.0% of transactions with latency between 0 and 300ms over the last 7 days</summary>

```
curl --request POST \
  --url http://localhost:5601/cyp/api/observability/slos \
  --header 'Authorization: Basic ZWxhc3RpYzpjaGFuZ2VtZQ==' \
  --header 'Content-Type: application/json' \
  --header 'kbn-xsrf: oui' \
  --data '{
    "name": "My SLO Name",
    "description": "My SLO Description",
    "indicator": {
        "type": "sli.histogram.custom",
        "params": {
            "filter": "",
            "index": "transactions-*",
            "timestampField": "custom_timestamp",
            "good": {
                "aggregation": "range",
                "field": "latency",
                "from": 0,
                "to": 300
            },
            "total": {
                "aggregation": "value_count",
                "field": "latency"
            }
        }
    },
    "timeWindow": {
        "duration": "7d",
        "type": "rolling"
    },
    "budgetingMethod": "occurrences",
    "objective": {
        "target": 0.95
    }
}'
```
</details>