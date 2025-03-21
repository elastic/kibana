import { IndicesCreateRequest } from "@elastic/elasticsearch/lib/api/types";

export const employeesIndexCreateRequest: IndicesCreateRequest = {
    index: 'employees.evaluations.2025.03.21',
    "mappings": {
    "properties": {
      "emp_no": {
        "type": "keyword"
      },
      "hire_date": {
        "type": "date",
        "format": "yyyy-MM-dd"
      }
    }
  }
}