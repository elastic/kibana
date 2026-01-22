# Alert Rules - Dev Tools Queries

Copy and paste these queries into Kibana Dev Tools (Management → Dev Tools) to create alert rules.

## Prerequisites

First, run synthtrace to generate data:
```bash
node scripts/synthtrace.js logs_traces_hosts --live
```

---

## Step 1: Create a Data View for Logs

```
POST kbn:/api/data_views/data_view
{
  "data_view": {
    "title": "logs-*",
    "name": "Logs",
    "timeFieldName": "@timestamp"
  }
}
```

## Step 2: Create a Server Log Connector (Optional - for actions)

```
POST kbn:/api/actions/connector
{
  "name": "Server Log Connector",
  "connector_type_id": ".server-log"
}
```

Save the `id` from the response - you'll need it for rule actions.

---

## Step 3: Create Alert Rules

### Rule 1: Log Count Threshold (fires when log count > 10)

This rule will fire almost immediately with synthtrace data.

```
POST kbn:/api/alerting/rule
{
  "name": "High Log Volume Alert",
  "tags": ["observability", "logs", "demo"],
  "rule_type_id": "observability.rules.custom_threshold",
  "consumer": "logs",
  "schedule": {
    "interval": "1m"
  },
  "params": {
    "criteria": [
      {
        "comparator": ">",
        "threshold": [10],
        "timeSize": 1,
        "timeUnit": "m",
        "metrics": [
          {
            "name": "A",
            "filter": "",
            "aggType": "count"
          }
        ]
      }
    ],
    "alertOnNoData": false,
    "alertOnGroupDisappear": false,
    "searchConfiguration": {
      "query": {
        "query": "",
        "language": "kuery"
      },
      "index": "logs-*"
    }
  },
  "actions": []
}
```

### Rule 2: Error Log Alert (fires on error logs)

```
POST kbn:/api/alerting/rule
{
  "name": "Error Logs Detected",
  "tags": ["observability", "logs", "errors", "demo"],
  "rule_type_id": "observability.rules.custom_threshold",
  "consumer": "logs",
  "schedule": {
    "interval": "1m"
  },
  "params": {
    "criteria": [
      {
        "comparator": ">",
        "threshold": [0],
        "timeSize": 5,
        "timeUnit": "m",
        "metrics": [
          {
            "name": "A",
            "filter": "log.level: error OR log.level: ERROR",
            "aggType": "count"
          }
        ]
      }
    ],
    "alertOnNoData": false,
    "alertOnGroupDisappear": false,
    "searchConfiguration": {
      "query": {
        "query": "log.level: error OR log.level: ERROR",
        "language": "kuery"
      },
      "index": "logs-*"
    }
  },
  "actions": []
}
```

### Rule 3: High CPU Alert (Infrastructure)

```
POST kbn:/api/alerting/rule
{
  "name": "High CPU Usage",
  "tags": ["observability", "infrastructure", "cpu", "demo"],
  "rule_type_id": "observability.rules.custom_threshold",
  "consumer": "infrastructure",
  "schedule": {
    "interval": "1m"
  },
  "params": {
    "criteria": [
      {
        "comparator": ">",
        "threshold": [50],
        "timeSize": 1,
        "timeUnit": "m",
        "metrics": [
          {
            "name": "A",
            "field": "system.cpu.total.norm.pct",
            "filter": "",
            "aggType": "avg"
          }
        ]
      }
    ],
    "alertOnNoData": false,
    "alertOnGroupDisappear": false,
    "searchConfiguration": {
      "query": {
        "query": "",
        "language": "kuery"
      },
      "index": "metrics-*"
    }
  },
  "actions": []
}
```

### Rule 4: APM Error Count (requires APM data)

```
POST kbn:/api/alerting/rule
{
  "name": "APM High Error Rate",
  "tags": ["observability", "apm", "errors", "demo"],
  "rule_type_id": "apm.error_rate",
  "consumer": "apm",
  "schedule": {
    "interval": "1m"
  },
  "params": {
    "threshold": 5,
    "windowSize": 5,
    "windowUnit": "m",
    "environment": "ENVIRONMENT_ALL"
  },
  "actions": []
}
```

### Rule 5: APM Latency Threshold

```
POST kbn:/api/alerting/rule
{
  "name": "APM High Latency",
  "tags": ["observability", "apm", "latency", "demo"],
  "rule_type_id": "apm.transaction_duration",
  "consumer": "apm",
  "schedule": {
    "interval": "1m"
  },
  "params": {
    "threshold": 1000,
    "windowSize": 5,
    "windowUnit": "m",
    "aggregationType": "avg",
    "environment": "ENVIRONMENT_ALL"
  },
  "actions": []
}
```

---

## Step 4: Generate External Events (Your PoC)

```
POST kbn:/api/observability/events/mock?provider=prometheus&count=5

POST kbn:/api/observability/events/mock?provider=datadog&count=5

POST kbn:/api/observability/events/mock?provider=sentry&count=5

POST kbn:/api/observability/events/mock?provider=all&count=10
```

---

## Useful Queries

### List all rules
```
GET kbn:/api/alerting/rules/_find?per_page=100
```

### Get rule by ID
```
GET kbn:/api/alerting/rule/{rule_id}
```

### Delete a rule
```
DELETE kbn:/api/alerting/rule/{rule_id}
```

### List all alerts
```
GET kbn:/api/alerting/alerts/_find?per_page=100
```

### List external events
```
GET kbn:/api/observability/events?size=100
```

---

## Quick Demo Script

Run these in order for a complete demo:

1. Start synthtrace: `node scripts/synthtrace.js logs_traces_hosts --live`
2. Create data view (Step 1 above)
3. Create "High Log Volume Alert" rule (Rule 1)
4. Wait 1-2 minutes for rule to fire
5. Generate external events (Step 4)
6. Go to Observability → Alerts to see both!

