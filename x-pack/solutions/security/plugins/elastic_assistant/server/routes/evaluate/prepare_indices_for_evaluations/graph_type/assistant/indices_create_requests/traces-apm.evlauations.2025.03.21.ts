import { IndicesCreateRequest } from "@elastic/elasticsearch/lib/api/types";

export const tracesApmIndexCreateRequest: IndicesCreateRequest = {
    index:"traces-apm.evlauations.2025.03.21",
    "mappings": {
    "properties": {
      "@timestamp": {
        "type": "date"
      },
      "event": {
        "properties": {
          "outcome": {
            "type": "keyword"
          }
        }
      },
      "transaction": {
        "properties": {
          "duration": {
            "type": "long"
          },
          "id": {
            "type": "keyword"
          }
        }
      },
      "service": {
        "properties": {
          "name": {
            "type": "keyword"
          }
        }
      }
    }
  }
}