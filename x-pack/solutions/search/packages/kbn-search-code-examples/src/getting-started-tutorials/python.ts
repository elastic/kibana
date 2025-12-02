/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { GettingStartedCodeExample } from '.';
import type {
  CodeLanguage,
  GettingStartedCodeDefinition,
  GettingStartedCodeSnippetFunction,
} from './types';

export const PYTHON_INFO: CodeLanguage = {
  id: 'python',
  title: i18n.translate('xpack.searchGettingStarted.codingLanguages.python', {
    defaultMessage: 'Python (elasticsearch-py)',
  }),
  icon: 'python.svg',
  codeBlockLanguage: 'python',
};

const installCommandShell = 'pip install elasticsearch';

const gettingStartedSemantic: GettingStartedCodeSnippetFunction = ({
  elasticsearchURL,
  apiKey,
  queryObject,
  sampleDocuments,
}) => `from elasticsearch import Elasticsearch, helpers

client = Elasticsearch(
    "${elasticsearchURL}",
    api_key="${apiKey}"
)

# -----------------------------
# Define the index name and create index (if it doesn't exist)
# -----------------------------
index_name = "${GettingStartedCodeExample.indexName}"

if not client.indices.exists(index=index_name):
    create_response = client.indices.create(index=index_name)
    print("Index created:", create_response)
else:
    print(f"Index '{index_name}' already exists.")

# -----------------------------
# Add or update mappings for the index
# -----------------------------
mappings = {
    "properties": {
        "text": {
            "type": "semantic_text"
        }
    }
}

mapping_response = client.indices.put_mapping(
    index=index_name,
    body=mappings
)
print("Mappings updated:", mapping_response)

# -----------------------------
# Sample documents to ingest
# -----------------------------
docs = ${JSON.stringify(sampleDocuments, null, 4)}

# -----------------------------
# Bulk ingest documents
# -----------------------------
ingestion_timeout=300 # Allow time for semantic ML model to load

bulk_response = helpers.bulk(
    client.options(request_timeout=ingestion_timeout),
    docs,
    index=index_name,
    refresh="wait_for" # Wait until indexed documents are visible for search before returning the response
)
print(bulk_response)

# -----------------------------
# Define semantic search query
# -----------------------------
retriever_object = ${JSON.stringify(queryObject.retriever, null, 4)}

search_response = client.search(
    index=index_name,
    retriever=retriever_object,
)
print(search_response['hits']['hits'])
`;

export const PythonConnectDeploymentExample: GettingStartedCodeDefinition = {
  gettingStartedSemantic,
  installCommandShell,
};
