/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const basicsTutorialCommands: string = `# Welcome to the Elasticsearch Basics Tutorial! 🎉
# 🚀 This tutorial will guide you through the fundamental operations in Elasticsearch using API calls from within the Kibana Console. 
# After selecting a command, execute it by clicking the ▶️ button or pressing Ctrl+Enter or Cmd+Enter.

# -----------------------------------------------
# Step 1: Create a new index named 'kibana_sample_data_basics' 📝
# -----------------------------------------------

PUT /kibana_sample_data_basics

# ✅ The response includes a confirmation that the index was created. 

# -----------------------------------------------
# Step 2: Verify the index exists 👀
# -----------------------------------------------

GET /kibana_sample_data_basics

# ✅ The response includes the index details, including mappings and settings.

# -----------------------------------------------
# Step 3: Add data to your index ✍️
# -----------------------------------------------
# You add data to Elasticsearch as JSON objects called documents. 📄
# Elasticsearch stores these documents in searchable indices.

POST kibana_sample_data_basics/_doc
{
  "name": "Snow Crash",
  "author": "Neal Stephenson",
  "release_date": "1992-06-01",
  "page_count": 470
}

# ✅ The response includes the unique document _id and other metadata. 

# -----------------------------------------------
# Step 4: Add multiple documents using the _bulk endpoint 📦
# -----------------------------------------------
# Use the _bulk endpoint to add multiple documents in one request.
# Bulk data must be formatted as newline-delimited JSON (NDJSON).

POST /_bulk
{ "index" : { "_index" : "kibana_sample_data_basics" } }
{"name": "Revelation Space", "author": "Alastair Reynolds", "release_date": "2000-03-15", "page_count": 585}
{ "index" : { "_index" : "kibana_sample_data_basics" } }
{"name": "1984", "author": "George Orwell", "release_date": "1985-06-01", "page_count": 328}
{ "index" : { "_index" : "kibana_sample_data_basics" } }
{"name": "Fahrenheit 451", "author": "Ray Bradbury", "release_date": "1953-10-15", "page_count": 227}
{ "index" : { "_index" : "kibana_sample_data_basics" } }
{"name": "Brave New World", "author": "Aldous Huxley", "release_date": "1932-06-01", "page_count": 268}
{ "index" : { "_index" : "kibana_sample_data_basics" } }
{"name": "The Handmaids Tale", "author": "Margaret Atwood", "release_date": "1985-06-01", "page_count": 311}

# ✅ The response includes a summary of successes and errors for each operation. 📊

# -----------------------------------------------
# Step 5: Use dynamic mapping 🔄
# -----------------------------------------------
# Add a new document with a field that doesn't appear in existing documents.
# Elasticsearch will automatically create mappings for new fields.
# Here we add a 'language' field:

POST /kibana_sample_data_basics/_doc
{
  "name": "The Great Gatsby",
  "author": "F. Scott Fitzgerald",
  "release_date": "1925-04-10",
  "page_count": 180,
  "language": "EN"
}

# ✅ The response includes a confirmation that the document was added.

# -----------------------------------------------
# Step 6: View the mapping for the kibana_sample_data_basics index 👀
# -----------------------------------------------
# The new field 'language' has been added to the mapping with a 'text' data type.

GET /kibana_sample_data_basics/_mapping

# ✅ The response includes the new 'language' field in the mapping.

# -----------------------------------------------
# Step 7: Search all documents 🔎
# -----------------------------------------------
# Run a search query to retrieve all documents from the kibana_sample_data_basics index.

GET /kibana_sample_data_basics/_search

# ✅ The response includes a list of all documents in the index.

# -----------------------------------------------
# Step 8: Use match query 🎯
# -----------------------------------------------
# Search for documents that contain a specific value in a specific field.
# This is the standard query for full-text searches.

GET /kibana_sample_data_basics/_search
{
  "query": {
    "match": {
      "name": "brave"
    }
  }
}

# ✅ The response includes a list of matching documents for the "brave" search term.

# You can match against any field in these documents because this index uses dynamic mapping.
# While dynamic mapping is helpful to get started, you may want to define explicit mappings for better performance and control over your search behavior.

# -----------------------------------------------
# Step 9: Explicit mappings 🗂️
# -----------------------------------------------
# Create an index with explicit mappings to control which fields are indexed.
# Fields not defined in the mapping will still be stored in the document's _source field, but they won’t be indexed or searchable.

PUT /kibana_sample_data_basics_explicit_mapping
{
  "mappings": {
    "dynamic": false,
    "properties": {
      "author": {
        "type": "text"
      }
    }
  }
}

# Add a single document to the explicitly mapped index. ✍️

POST /kibana_sample_data_basics_explicit_mapping/_doc
{"name": "Brave New World", "author": "Aldous Huxley", "release_date": "1932-06-01", "page_count": 268}

# ❌ Since the explicit mapping only indexes the 'author' field, searching by 'name' will not return any results.

GET /kibana_sample_data_basics_explicit_mapping/_search
{
  "query": {
    "match": {
      "name": "brave"
    }
  }
}

# You can search across multiple indices using a wildcard (*) in the path 🔦

GET /kibana_sample_data_basics*/_search
{
  "query": {
    "match": {
      "author": "Aldous Huxley"
    }
  }
}

# ✅ Notice the results include documents from both indices.

# -----------------------------------------------
# Step 10: Delete your indices (optional) 🗑️
# -----------------------------------------------
# Delete indices to clean up or start from scratch.
# Warning: Deleting an index permanently deletes its documents, shards, and metadata.

DELETE /kibana_sample_data_basics
DELETE /kibana_sample_data_basics_explicit_mapping

# ✅ The response includes a confirmation that the indices were deleted.

# -----------------------------------------------
# Conclusion 🎓
# -----------------------------------------------
# In this tutorial, you learned the basics of working with Elasticsearch using the Kibana Console.
# You covered creating an index, indexing documents, searching, and managing mappings.
# 📖 See more search query options in the Elasticsearch documentation: https://www.elastic.co/docs/reference/query-languages/query-dsl/full-text-queries
# 📖 Empower your search with AI! Learn more about semantic search here: https://www.elastic.co/docs/solutions/search/semantic-search/semantic-search-semantic-text
# 🔗 Manage your inference endpoints: {inference_endpoints_url}
# 🔗 Try the Search Playground: {search_playground_url}
# 🔗 Build Search Applications: {search_applications_url}
`;
