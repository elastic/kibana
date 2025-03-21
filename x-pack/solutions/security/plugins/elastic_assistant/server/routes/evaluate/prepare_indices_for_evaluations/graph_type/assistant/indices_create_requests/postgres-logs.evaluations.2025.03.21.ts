import { IndicesCreateRequest } from "@elastic/elasticsearch/lib/api/types";

export const postgresLogsIndexCreateRequest: IndicesCreateRequest = {
    index: "postgres-logs.evaluations.2025.03.21",
    "mappings": {
        "properties": {
            "message": {
                "type": "text"
            },
            "query_duration": {
                "type": "keyword"
            },
            "query_duration_num": {
                "type": "double"
            }
        }
    }
}