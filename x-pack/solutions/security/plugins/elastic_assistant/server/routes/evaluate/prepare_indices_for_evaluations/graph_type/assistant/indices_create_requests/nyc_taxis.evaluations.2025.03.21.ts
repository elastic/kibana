import { IndicesCreateRequest } from "@elastic/elasticsearch/lib/api/types";

export const nycTaxisIndexCreateRequest: IndicesCreateRequest = {
    index: "nyc_taxis.evaluations.2025.03.21",
    "mappings": {
        "properties": {
            "drop_off_time": {
                "type": "date",
                "format": "strict_date_optional_time||epoch_millis"
            },
            "other_field": {
                "type": "keyword"
            }
        }
    }
}