/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */
import { readFileSync } from 'node:fs';
import { Client, HttpConnection } from '@elastic/elasticsearch';
import { resolve } from 'node:path';

async function run() {
  const indexName = 'kibana_ai_es_api_doc';
  const inputPath = resolve(__dirname, 'documents.json');
  const raw = readFileSync(inputPath, 'utf-8');
  const allDocuments: Record<string, any>[] = JSON.parse(raw);

  // Filter to only GET and POST methods
  const documents = allDocuments.filter((doc) => {
    const method = doc.method?.toLowerCase();
    return method === 'get' || method === 'post';
  });

  console.log(`Total documents in file: ${allDocuments.length}`);
  console.log(`Documents after filtering (GET/POST only): ${documents.length}`);

  const esClient = new Client({
    node: 'http://elastic:changeme@127.0.0.1:9200/',
    Connection: HttpConnection,
    requestTimeout: 300_000,
  });

  const exists = await esClient.indices.exists({ index: indexName });
  if (exists) {
    console.log(`Index ${indexName} already exists. Deleting...`);
    await esClient.indices.delete({ index: indexName });
    console.log(`Index ${indexName} deleted.`);
  }

  console.log(`Creating index ${indexName}...`);
  await esClient.indices.create({
    index: indexName,
    settings: {
      'index.mapping.total_fields.limit': 2000,
    },
    mappings: {
      properties: {
        // Semantic text fields for semantic search
        description: {
          type: 'semantic_text',
          inference_id: '.multilingual-e5-small-elasticsearch',
        },
        endpoint: {
          type: 'semantic_text',
          inference_id: '.multilingual-e5-small-elasticsearch',
        },
        summary: {
          type: 'semantic_text',
          inference_id: '.multilingual-e5-small-elasticsearch',
        },
        // Text fields for lexical search
        description_text: { type: 'text' },
        summary_text: { type: 'text' },
        operationId: { type: 'text' },
        // Keyword fields for exact and prefix matching
        method: { type: 'keyword' },
        path: {
          type: 'text',
          fields: {
            keyword: { type: 'keyword' },
          },
        },
        tags: { type: 'keyword' },
        // Nested and other fields
        parameters: {
          type: 'object',
          enabled: false,
        },
        responses: {
          type: 'object',
          enabled: false,
        },
        example: {
          type: 'object',
          enabled: false,
        },
      },
    },
  });
  console.log(`Index ${indexName} created successfully.`);

  // Prepare bulk operations only with the needed fields
  console.log('Preparing bulk operations...');
  const operations = documents.flatMap((doc) => {
    const payload: Record<string, any> = {
      // Search fields
      description: doc.description ?? '',
      summary: doc.summary ?? '',
      operationId: doc.operationId ?? '',
      method: doc.method ?? '',
      path: doc.path ?? '',
      tags: doc.tags ?? [],
      // Text versions for lexical search
      description_text: doc.description ?? '',
      summary_text: doc.summary ?? '',
      // Store complete data for tool generation (but don't index deeply)
      parameters: doc.parameters ?? [],
      responses: doc.responses ?? {},
      example: doc.example ?? [],
    };
    if (doc.method && doc.path) {
      payload.endpoint = `${doc.method.toUpperCase()} ${doc.path}`;
    }

    return [{ index: { _index: indexName } }, payload];
  });

  console.log(`Bulk operations prepared: ${operations.length / 2} documents`);
  console.log('Starting bulk indexing...');

  const response = await esClient.bulk({
    refresh: true,
    operations: operations as any,
  });

  if (response.errors) {
    const errorItems = response.items.filter((item) => item.index?.error);
    console.error(`Bulk indexing had ${errorItems.length} errors:`);
    errorItems.slice(0, 5).forEach((item) => {
      console.error(JSON.stringify(item.index?.error, null, 2));
    });
    throw new Error(
      `Error indexing documents: ${errorItems.length} failed out of ${response.items.length}`
    );
  }

  console.log(`✅ Successfully indexed ${response.items.length} documents!`);
  console.log(`Took: ${response.took}ms`);
}

run().catch((err) => {
  console.error('❌ Error running ingestion:', err);
  process.exit(1);
});
