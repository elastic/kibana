# Metrics Explorer Views CRUD api

## Find all: `GET /api/infra/metrics_explorer_views`

Retrieves all metrics explorer views in a reduced version.

### Request

- **Method**: GET
- **Path**: /api/infra/metrics_explorer_views
- **Query params**:
  - `sourceId` _(optional)_: Specify a source id related to the metrics explorer views. Default value: `default`.

### Response

```json
GET /api/infra/metrics_explorer_views

Status code: 200

{
  "data": [
    {
      "id": "static",
      "attributes": {
        "name": "Default view",
        "isDefault": false,
        "isStatic": true
      }
    },
    {
      "id": "927ad6a0-da0c-11ed-9487-41e9b90f96b9",
      "version": "WzQwMiwxXQ==",
      "updatedAt": 1681398305034,
      "attributes": {
        "name": "Ad-hoc",
        "isDefault": true,
        "isStatic": false
      }
    },
    {
      "id": "c301ef20-da0c-11ed-aac0-77131228e6f1",
      "version": "WzQxMCwxXQ==",
      "updatedAt": 1681398386450,
      "attributes": {
        "name": "Custom",
        "isDefault": false,
        "isStatic": false
      }
    }
  ]
}
```

## Get one: `GET /api/infra/metrics_explorer_views/{metricsExplorerViewId}`

Retrieves a single metrics explorer view by ID

### Request

- **Method**: GET
- **Path**: /api/infra/metrics_explorer_views/{metricsExplorerViewId}
- **Query params**:
  - `sourceId` _(optional)_: Specify a source id related to the metrics explorer view. Default value: `default`.

### Response

```json
GET /api/infra/metrics_explorer_views/927ad6a0-da0c-11ed-9487-41e9b90f96b9

Status code: 200

{
  "data": {
    "id": "927ad6a0-da0c-11ed-9487-41e9b90f96b9",
    "version": "WzQwMiwxXQ==",
    "updatedAt": 1681398305034,
    "attributes": {
      "name": "Ad-hoc",
      "options": {
        "aggregation": "avg",
        "metrics": [
          {
            "aggregation": "avg",
            "field": "system.cpu.total.norm.pct",
            "color": "color0"
          },
        ],
        "source": "default",
        "groupBy": [
          "host.name"
        ]
      },
      "chartOptions": {
        "type": "line",
        "yAxisMode": "fromZero",
        "stack": false
      },
      "currentTimerange": {
        "from": "now-1h",
        "to": "now",
        "interval": ">=10s"
      },
      "isDefault": false,
      "isStatic": false
    }
  }
}
```

```json
GET /api/infra/metrics_explorer_views/random-id

Status code: 404

{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Saved object [metrics-explorer-view/random-id] not found"
}
```

## Create one: `POST /api/infra/metrics_explorer_views`

Creates a new metrics explorer view.

`aggregation`: `"avg" | "max" | "min" | "cardinality" | "rate" | "count" | "sum" | "p95" | "p99" | "custom"`

`metrics.aggregation`: `"avg" | "max" | "min" | "cardinality" | "rate" | "count" | "sum" | "p95" | "p99" | "custom"`

`chartOptions.type`: `"line" | "area" | "bar"`
`chartOptions.yAxisMode`: `"fromZero" | "auto" | "bar"`

### Request

- **Method**: POST
- **Path**: /api/infra/metrics_explorer_views
- **Request body**:

  ```json
  {
    "attributes": {
      "name": "View name",
      "options": {
        "aggregation": "avg",
        "metrics": [
          {
            "aggregation": "avg",
            "field": "system.cpu.total.norm.pct",
            "color": "color0"
          },
        ],
        "source": "default",
        "groupBy": [
          "host.name"
        ]
      },
      "chartOptions": {
        "type": "line",
        "yAxisMode": "fromZero",
        "stack": false
      },
      "currentTimerange": {
        "from": "now-1h",
        "to": "now",
        "interval": ">=10s"
      },
    }
  }
  ```

### Response

```json
POST /api/infra/metrics_explorer_views

Status code: 201

{
  "data": {
    "id": "927ad6a0-da0c-11ed-9487-41e9b90f96b9",
    "version": "WzQwMiwxXQ==",
    "updatedAt": 1681398305034,
    "attributes": {
      "name": "View name",
      "options": {
        "aggregation": "avg",
        "metrics": [
          {
            "aggregation": "avg",
            "field": "system.cpu.total.norm.pct",
            "color": "color0"
          },
        ],
        "source": "default",
        "groupBy": [
          "host.name"
        ]
      },
      "chartOptions": {
        "type": "line",
        "yAxisMode": "fromZero",
        "stack": false
      },
      "currentTimerange": {
        "from": "now-1h",
        "to": "now",
        "interval": ">=10s"
      },
      "isDefault": false,
      "isStatic": false
    }
  }
}
```

Send in the payload a `name` attribute already held by another view:
```json
POST /api/infra/metrics_explorer_views

Status code: 409

{
  "statusCode": 409,
  "error": "Conflict",
  "message": "A view with that name already exists."
}
```

## Update one: `PUT /api/infra/metrics_explorer_views/{metricsExplorerViewId}`

Updates a metrics explorer view.

Any attribute can be updated except for `isDefault` and `isStatic`, which are derived by the source configuration preference set by the user.

Any attempt to update the static view with id `0` will return a `400 The metrics explorer view with id 0 is not configurable.` 

### Request

- **Method**: PUT
- **Path**: /api/infra/metrics_explorer_views/{metricsExplorerViewId}
- **Query params**:
  - `sourceId` _(optional)_: Specify a source id related to the metrics explorer view. Default value: `default`.
- **Request body**:
  ```json
  {
    "attributes": {
      "name": "View name",
      "options": {
        "aggregation": "avg",
        "metrics": [
          {
            "aggregation": "avg",
            "field": "system.cpu.total.norm.pct",
            "color": "color0"
          },
        ],
        "source": "default",
        "groupBy": [
          "host.name"
        ]
      },
      "chartOptions": {
        "type": "line",
        "yAxisMode": "fromZero",
        "stack": false
      },
      "currentTimerange": {
        "from": "now-1h",
        "to": "now",
        "interval": ">=10s"
      }
    }
  }
  ```

### Response

```json
PUT /api/infra/metrics_explorer_views/927ad6a0-da0c-11ed-9487-41e9b90f96b9

Status code: 200

{
  "data": {
    "id": "927ad6a0-da0c-11ed-9487-41e9b90f96b9",
    "version": "WzQwMiwxXQ==",
    "updatedAt": 1681398305034,
    "attributes": {
      "name": "View name",
      "options": {
        "aggregation": "avg",
        "metrics": [
          {
            "aggregation": "avg",
            "field": "system.cpu.total.norm.pct",
            "color": "color0"
          },
        ],
        "source": "default",
        "groupBy": [
          "host.name"
        ]
      },
      "chartOptions": {
        "type": "line",
        "yAxisMode": "fromZero",
        "stack": false
      },
      "currentTimerange": {
        "from": "now-1h",
        "to": "now",
        "interval": ">=10s"
      },
      "isDefault": false,
      "isStatic": false
    }
  }
}
```

```json
PUT /api/infra/metrics_explorer_views/random-id

Status code: 404

{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Saved object [metrics-explorer-view/random-id] not found"
}
```

Send in the payload a `name` attribute already held by another view:
```json
PUT /api/infra/metrics_explorer_views/927ad6a0-da0c-11ed-9487-41e9b90f96b9

Status code: 409

{
  "statusCode": 409,
  "error": "Conflict",
  "message": "A view with that name already exists."
}
```

## Delete one: `DELETE /api/infra/metrics_explorer_views/{metricsExplorerViewId}`

Deletes a metrics explorer view.

Any attempt to delete the static view with id `0` will return a `400 The metrics explorer view with id 0 is not configurable.`

### Request

- **Method**: DELETE
- **Path**: /api/infra/metrics_explorer_views/{metricsExplorerViewId}

### Response

```json
DELETE /api/infra/metrics_explorer_views/927ad6a0-da0c-11ed-9487-41e9b90f96b9

Status code: 204 No content
```

```json
DELETE /api/infra/metrics_explorer_views/random-id

Status code: 404

{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Saved object [metrics-explorer-view/random-id] not found"
}
```
