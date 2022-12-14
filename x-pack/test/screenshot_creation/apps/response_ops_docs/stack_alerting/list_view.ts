/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { getTestRuleData } from '../../../../functional/services/rules/test_resources';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const commonScreenshots = getService('commonScreenshots');
  const screenshotDirectories = ['response_ops_docs', 'stack_alerting'];
  const pageObjects = getPageObjects(['common', 'header']);
  const actions = getService('actions');
  const supertest = getService('supertest');

  describe.only('list view', function () {
    let serverLogConnectorId: string;

    before(async () => {
      const connectorName = `server-log-connector`;
      ({ id: serverLogConnectorId } = await createServerLogConnector(connectorName));
    });

    after(async () => {
      await actions.api.deleteConnector(serverLogConnectorId);
    });

    it('connectors list screenshot', async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await commonScreenshots.takeScreenshot(
        'connector-listing',
        screenshotDirectories,
        1400,
        1024
      );
    });

    it('rules list screenshot', async () => {
      await supertest
      .post(`/api/alerting/rule`)
      .set('kbn-xsrf', 'foo')
      .send(getTestRuleData())
      .expect(200);
      await pageObjects.common.navigateToApp('triggersActions');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await commonScreenshots.takeScreenshot(
        'rules-ui',
        screenshotDirectories,
        1400,
        1024
      );
    });
  });

  const createServerLogConnector = async (name: string) => {
    return actions.api.createConnector({
      name,
      config: {},
      secrets: {},
      connectorTypeId: '.server-log',
    });
  };
}
