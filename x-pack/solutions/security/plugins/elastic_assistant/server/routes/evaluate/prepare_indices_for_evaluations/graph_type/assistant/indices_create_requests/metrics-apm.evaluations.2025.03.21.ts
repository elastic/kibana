import { IndicesCreateRequest } from "@elastic/elasticsearch/lib/api/types";

export const metricsApmIndexCreateRequest: IndicesCreateRequest = {
  index: 'metrics-apm.evaluations.2025.03.21',
  "mappings": {
    "properties": {
      "@timestamp": { "type": "date" },
      "metricset": {
        "properties": {
          "name": { "type": "keyword" },
          "interval": { "type": "keyword" }
        }
      },
      "transaction": {
        "properties": {
          "duration": {
            "properties": {
              "histogram": { "type": "double" }
            }
          }
        }
      }
    }
  }
}