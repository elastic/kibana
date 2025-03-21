import { IndicesCreateRequest } from "@elastic/elasticsearch/lib/api/types";

export const metricbeatIndexCreateRequest: IndicesCreateRequest = {
    index:'metricbeat.evaluations-2025.03.21',
    "mappings": {
    "properties": {
      "system": {
        "properties": {
          "cpu": {
            "properties": {
              "user": {
                "properties": {
                  "pct": { "type": "float" }
                }
              },
              "system": {
                "properties": {
                  "pct": { "type": "float" }
                }
              },
              "cores": { "type": "integer" }
            }
          }
        }
      },
      "host": {
        "properties": {
          "name": { "type": "keyword" }
        }
      }
    }
  }
}