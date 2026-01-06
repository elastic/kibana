/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { GettingStartedCodeExample } from '.';
import type { CodeLanguage, GettingStartedCodeDefinition } from './types';

export const CURL_INFO: CodeLanguage = {
  id: 'curl',
  title: i18n.translate('xpack.searchGettingStarted.codingLanguages.curl', {
    defaultMessage: 'cURL',
  }),
  icon: 'curl.svg',
  codeBlockLanguage: 'bash',
};

const formatSampleDocs = (sampleDocuments: object[], indexName: string) => {
  const result = sampleDocuments
    .map((document) => `{ "index" : { "_index" : "${indexName}" } }\n${JSON.stringify(document)}`)
    .join('\n');

  return result;
};

export const CurlConnectDeploymentExample: GettingStartedCodeDefinition = {
  gettingStartedSemantic: ({
    elasticsearchURL,
    apiKey,
    queryObject,
    sampleDocuments,
  }) => `# -----------------------------
# Create the index and mappings
# -----------------------------
curl -X PUT '${elasticsearchURL}/${GettingStartedCodeExample.indexName}' \
--header 'Authorization: ApiKey ${apiKey}' \
--header 'Content-Type: application/json' \
--data-raw '{
  "mappings": {
    "properties":{
      "text":{
        "type":"semantic_text"
      }
    }
  }
}'

# -----------------------------
# Bulk ingest documents
# -----------------------------
curl -X POST "${elasticsearchURL}/_bulk?pretty" \
--header 'Authorization: ApiKey ${apiKey}' \
--header 'Content-Type: application/json' \
-d'
${formatSampleDocs(sampleDocuments, GettingStartedCodeExample.indexName)}
'

# -----------------------------
# Perform semantic search
# -----------------------------
curl -X POST "${elasticsearchURL}/${GettingStartedCodeExample.indexName}/_search" \
--header 'Authorization: ApiKey ${apiKey}' \
--header 'Content-Type: application/json' \
-d'${JSON.stringify(queryObject)}'`,
};
