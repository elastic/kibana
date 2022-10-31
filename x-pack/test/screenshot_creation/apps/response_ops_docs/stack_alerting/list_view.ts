/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const commonScreenshots = getService('commonScreenshots');
  const screenshotDirectories = ['response_ops_docs', 'stack_alerting'];
  const pageObjects = getPageObjects(['common', 'header']);
  const rules = getService('rules');
  const supertest = getService('supertest');

  describe.only('list view', function () {
    let serverLogConnectorId: string;

    before(async () => {
      const connectorName = `server-log-connector`;
      ({ id: serverLogConnectorId } = await createServerLogConnector(connectorName));
    });

    after(async () => {
      await deleteConnector(serverLogConnectorId);
    });

    it('connectors list screenshot', async () => {
      await pageObjects.common.navigateToUrl(
        'management',
        'insightsAndAlerting/triggersActionsConnectors',
        {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: true,
          shouldUseHashForSubUrl: false,
          basePath: '',
        }
      );
      await pageObjects.header.waitUntilLoadingHasFinished();
      await commonScreenshots.takeScreenshot(
        'connector-listing',
        screenshotDirectories,
        1400,
        1024
      );
    });
  });

  const createServerLogConnector = async (name: string) => {
    return rules.common.createConnector({
      name,
      config: {},
      secrets: {},
      connectorTypeId: '.server-log',
      supertest,
    });
  };

  const deleteConnector = (id: string) =>
    supertest.delete(`/api/actions/connector/${id}`).set('kbn-xsrf', 'foo').expect(204, '');
}
