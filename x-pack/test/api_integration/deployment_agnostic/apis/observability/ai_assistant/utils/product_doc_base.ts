/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';

import type SuperTest from 'supertest';
import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';
import { DocumentationProduct } from '@kbn/product-doc-common/src/product';
import { mockKibanaProductDoc } from '../complete/product_docs/products';
import { LOCAL_PRODUCT_DOC_PATH } from '../../../../default_configs/common_paths';

export async function installProductDoc(supertest: SuperTest.Agent) {
  return supertest
    .post('/internal/product_doc_base/install')
    .set(ELASTIC_HTTP_VERSION_HEADER, '1')
    .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
    .set('kbn-xsrf', 'foo')
    .expect(200);
}

export async function uninstallProductDoc(supertest: SuperTest.Agent) {
  return supertest
    .post('/internal/product_doc_base/uninstall')
    .set(ELASTIC_HTTP_VERSION_HEADER, '1')
    .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
    .set('kbn-xsrf', 'foo')
    .expect(200);
}

export async function createProductDoc(kibanaVersion: string) {
  const [versionMajor, versionMinor] = kibanaVersion.split('.');

  const artifacts: string[] = [];
  for (const productName of Object.values(DocumentationProduct)) {
    const zip = new AdmZip();
    zip.addFile(
      'content/content-1.ndjson',
      Buffer.from(
        JSON.stringify(productName === DocumentationProduct.kibana ? mockKibanaProductDoc : {}),
        'utf8'
      )
    );
    zip.addFile(
      'manifest.json',
      Buffer.from(
        JSON.stringify(
          {
            formatVersion: '1.0.0',
            productName,
            productVersion: `${versionMajor}.${versionMinor}`,
          },
          null,
          2
        ),
        'utf8'
      )
    );
    zip.addFile(
      'mappings.json',
      Buffer.from(
        JSON.stringify(
          {
            dynamic: 'strict',
            properties: {
              content_title: {
                type: 'text',
              },
              content_body: {
                type: 'semantic_text',
                inference_id: '.default-elser',
              },
              product_name: {
                type: 'keyword',
              },
              root_type: {
                type: 'keyword',
              },
              slug: {
                type: 'keyword',
              },
              url: {
                type: 'keyword',
              },
              version: {
                type: 'version',
              },
              ai_subtitle: {
                type: 'text',
              },
              ai_summary: {
                type: 'semantic_text',
                inference_id: '.default-elser',
              },
              ai_questions_answered: {
                type: 'semantic_text',
                inference_id: '.default-elser',
              },
              ai_tags: {
                type: 'keyword',
              },
            },
          },
          null,
          2
        ),
        'utf8'
      )
    );

    // naming convention follow this pattern: kb-product-doc-{{productName}}-{{versionMajor}}.{{versionMinor}}.zip: https://github.com/elastic/kibana/blob/33993b7123bc0d6c85d9c42b15610cc0d5092281/docs/reference/
    const folderName = `kb-product-doc-${productName}-${versionMajor}.${versionMinor}.zip`;
    artifacts.push(folderName);
    const outputZipPath = path.join(LOCAL_PRODUCT_DOC_PATH, folderName);

    zip.writeZip(outputZipPath);
  }

  const content = `<?xml version="1.0" encoding="UTF-8"?>
  <ListBucketResult>
      <Name>kibana-ai-assistant-kb-artifacts</Name>
      ${artifacts.map((key) => `<Contents>\n<Key>${key}</Key>\n</Contents>`).join('\n')}
  </ListBucketResult>`;
  const indexFilePath = path.join(LOCAL_PRODUCT_DOC_PATH, 'index.xml');
  fs.writeFileSync(indexFilePath, content, 'utf8');
}
