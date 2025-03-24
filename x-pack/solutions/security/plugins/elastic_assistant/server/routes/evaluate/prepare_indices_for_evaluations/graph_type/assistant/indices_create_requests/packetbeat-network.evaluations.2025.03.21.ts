import { IndicesCreateRequest } from "@elastic/elasticsearch/lib/api/types";

export const packetbeatIndexCreateRequest: IndicesCreateRequest = {
    index:"packetbeat-network.evaluations.2025.03.21",
    "mappings": {
        "properties": {
          "destination": {
            "properties": {
              "domain": {
                "type": "keyword"
              }
            }
          }
        }
      }
}