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
import type { ToolingLog } from '@kbn/tooling-log';
import expect from '@kbn/expect';

import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

const getOpenApiSpecDocsStatus = async (supertest: SuperTest.Agent, inferenceId: string) => {
  return supertest
    .get(`/internal/product_doc_base/status?inferenceId=${inferenceId}&resourceType=openapi_spec`)
    .set(ELASTIC_HTTP_VERSION_HEADER, '1')
    .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
    .set('kbn-xsrf', 'foo');
};
/**
 * Installs the OpenAPI spec product documentation required by the Elasticsearch tool.
 */
export async function installOpenApiSpecDocs(
  supertest: SuperTest.Agent,
  inferenceId: string,
  log: ToolingLog
) {
  log.info('Installing OpenAPI spec documentation (this may take several minutes)...');

  const response = await supertest
    .post('/internal/product_doc_base/install')
    .set(ELASTIC_HTTP_VERSION_HEADER, '1')
    .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
    .set('kbn-xsrf', 'foo')
    .send({
      inferenceId,
      resourceType: 'openapi_spec',
    })
    .expect(200);

  log.info('OpenAPI spec documentation installed successfully.');
  return response;
}

/**
 * uninstalls the OpenAPI spec product documentation.
 */
export async function uninstallOpenApiSpecDocs(
  supertest: SuperTest.Agent,
  inferenceId: string,
  log: ToolingLog
) {
  log.info('Uninstalling OpenAPI spec documentation...');

  const response = await supertest
    .post('/internal/product_doc_base/uninstall')
    .set(ELASTIC_HTTP_VERSION_HEADER, '1')
    .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
    .set('kbn-xsrf', 'foo')
    .send({
      inferenceId,
      resourceType: 'openapi_spec',
    })
    .expect(200);

  log.info('OpenAPI spec documentation uninstalled.');
  return response;
}

export async function waitForOpenApiSpecDocReady(
  getService: DeploymentAgnosticFtrProviderContext['getService'],
  inferenceId: string
) {
  const retry = getService('retry');
  const log = getService('log');
  // eslint-disable-next-line @kbn/eslint/deployment_agnostic_test_context
  const supertest = getService('supertest');
  log.debug(`Waiting for OpenAPI spec documentation to be ready... ${inferenceId}`);
  await retry.tryForTime(5 * 60 * 1000, async () => {
    log.debug(`Waiting for OpenAPI spec documentation to be ready...`);
    const { body, status } = await getOpenApiSpecDocsStatus(supertest, inferenceId);

    if (body.status !== 'installed') {
      log.warning(`OpenAPI spec documentation is not ready yet:
        Status code: ${status}
        Body: ${JSON.stringify(body, null, 2)}`);
    }

    expect(body.status).to.be('installed');
    log.info(`OpenAPI spec documentation is in ready state.`);
  });
}
