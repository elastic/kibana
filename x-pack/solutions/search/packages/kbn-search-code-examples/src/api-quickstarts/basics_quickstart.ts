/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const basicsQuickstartCommands: string = `# Welcome to the Elasticsearch Basics Quickstart!
# This quickstart will guide you through the fundamental operations in Elasticsearch
# using API calls from within the Kibana Dev console.

# After selecting a command, execute it by clicking the "Send Request" button or
# pressing Ctrl+Enter or Cmd+Enter.

# --------------------------------------------------------------------
# Step 1: Create a new index named 'books'
# --------------------------------------------------------------------
PUT /books
# The following response indicates the index was created successfully
#  {
#    "acknowledged": true,
#    "shards_acknowledged": true,
#    "index": "books"
#  }

# --------------------------------------------------------------------
# Step 2: Verify the index exists
# --------------------------------------------------------------------
GET /books

# Example response:
# {
#   "books": {
#     "aliases": {},
#     "mappings": {},
#     "settings": {}
#   }
# }

# --------------------------------------------------------------------
# Step 3: Add data to your index
# --------------------------------------------------------------------
# You add data to Elasticsearch as JSON objects called documents.
# Elasticsearch stores these documents in searchable indices.

POST books/_doc
{
  "name": "Snow Crash",
  "author": "Neal Stephenson",
  "release_date": "1992-06-01",
  "page_count": 470
}

# The response will include the unique document _id and other metadata.
# Example response:
# {
#  "_index": "books",
#  "_id": "O0lG2IsBaSa7VYx_rEia",
#  "_version": 1,
#  "result": "created",
#  "_shards": {
#    "total": 1,
#    "successful": 1,
#    "failed": 0
#  },
#  "_seq_no": 0,
#  "_primary_term": 1
# }

# --------------------------------------------------------------------
# Step 4: Add multiple documents using the _bulk endpoint
# --------------------------------------------------------------------
# Use the _bulk endpoint to add multiple documents in one request.
# Bulk data must be formatted as newline-delimited JSON (NDJSON).

POST /_bulk
{ "index" : { "_index" : "books" } }
{"name": "Revelation Space", "author": "Alastair Reynolds", "release_date": "2000-03-15", "page_count": 585}
{ "index" : { "_index" : "books" } }
{"name": "1984", "author": "George Orwell", "release_date": "1985-06-01", "page_count": 328}
{ "index" : { "_index" : "books" } }
{"name": "Fahrenheit 451", "author": "Ray Bradbury", "release_date": "1953-10-15", "page_count": 227}
{ "index" : { "_index" : "books" } }
{"name": "Brave New World", "author": "Aldous Huxley", "release_date": "1932-06-01", "page_count": 268}
{ "index" : { "_index" : "books" } }
{"name": "The Handmaids Tale", "author": "Margaret Atwood", "release_date": "1985-06-01", "page_count": 311}

# You should see a response indicating the success of each operation:
# {
#   "errors": false,
#   "took": 29,
#   "items": [
#     {
#       "index": {
#         "_index": "books",
#         "_id": "QklI2IsBaSa7VYx_Qkh-",
#         "_version": 1,
#         "result": "created",
#         "_shards": {
#           "total": 1,
#           "successful": 1,
#           "failed": 0
#         },
#         "_seq_no": 1,
#         "_primary_term": 1,
#         "status": 201
#       }
#     },
#     ... (truncated)
#   ]
# }

# --------------------------------------------------------------------
# Step 5: Use dynamic mapping
# --------------------------------------------------------------------
# Add a new document with a field that doesn't appear in existing documents.
# Elasticsearch will automatically create mappings for new fields.
# Here we add a 'language' field:

POST /books/_doc
{
  "name": "The Great Gatsby",
  "author": "F. Scott Fitzgerald",
  "release_date": "1925-04-10",
  "page_count": 180,
  "language": "EN"
}

# --------------------------------------------------------------------
# Step 6: View the mapping for the books index
# --------------------------------------------------------------------
# The new field 'language' has been added to the mapping with a 'text' data type.

GET /books/_mapping

# Example response:
# {
#   "books": {
#     "mappings": {
#       "properties": {
#         ... (truncated),
#         "language": {
#           "type": "text",
#           "fields": {
#             "keyword": {
#               "type": "keyword",
#               "ignore_above": 256
#             }
#           }
#         }
#       }
#     }
#   }
# }

# --------------------------------------------------------------------
# Step 7: Define explicit mapping
# --------------------------------------------------------------------
# Create an index with explicit mappings to control field data types and properties.
# Fields not defined in the mapping will still be stored in the document's
# _source field, but they won’t be indexed or searchable

PUT /my-explicit-mappings-books
{
  "mappings": {
    "dynamic": false,
    "properties": {
      "name": {
        "type": "text"
      },
      "author": {
        "type": "text"
      },
      "release_date": {
        "type": "date"
      },
      "page_count": {
        "type": "integer"
      }
    }
  }
}

# Example response:
# {
#   "acknowledged": true,
#   "shards_acknowledged": true,
#   "index": "my-explicit-mappings-books"
# }

# --------------------------------------------------------------------
# Step 8: Search all documents
# --------------------------------------------------------------------
# Run a search query to retrieve all documents from the books index.

GET books/_search

# Example response:
# {
#   "took": 2,
#   "timed_out": false,
#   "_shards": {
#     "total": 5,
#     "successful": 5,
#     "skipped": 0,
#     "failed": 0
#   },
#   "hits": {
#     "total": {
#       "value": 7,
#       "relation": "eq"
#     },
#     "max_score": 1,
#     "hits": [
#       {
#         "_index": "books",
#         "_id": "CwICQpIBO6vvGGiC_3Ls",
#         "_score": 1,
#         "_source": {
#           "name": "Brave New World",
#           "author": "Aldous Huxley",
#           "release_date": "1932-06-01",
#           "page_count": 268
#         }
#       },
#       ... (truncated)
#     ]
#   }
# }

# --------------------------------------------------------------------
# Step 9: Use match query
# --------------------------------------------------------------------
# Search for documents that contain a specific value in a specific field.
# This is the standard query for full-text searches.

GET books/_search
{
  "query": {
    "match": {
      "name": "brave"
    }
  }
}

# Example response:
# {
#   ... (truncated),
#   "hits": {
#     "total": {
#       "value": 1,
#       "relation": "eq"
#     },
#     "max_score": 0.6931471,
#     "hits": [
#       {
#         "_index": "books",
#         "_id": "CwICQpIBO6vvGGiC_3Ls",
#         "_score": 0.6931471,
#         "_source": {
#           "name": "Brave New World",
#           "author": "Aldous Huxley",
#           "release_date": "1932-06-01",
#           "page_count": 268
#         }
#       }
#     ]
#   }
# }

# --------------------------------------------------------------------
# Step 10: Delete your indices (optional)
# --------------------------------------------------------------------
# Delete indices to clean up or start from scratch.
# Warning: Deleting an index permanently deletes its documents, shards, and metadata.

DELETE /books
DELETE /my-explicit-mappings-books

# --------------------------------------------------------------------
# Conclusion
# --------------------------------------------------------------------
# In this quickstart, you learned the basics of working with Elasticsearch
# using the Kibana Dev Tools console. 
# You covered creating an index, indexing documents, searching, and managing mappings.

# Select "Index Management" in the left navigation panel to further explore your indices.
`;
