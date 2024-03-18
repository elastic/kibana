/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// a11y tests for spaces, space selection and space creation and feature controls
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'infraHome']);
  const observability = getService('observability');
  const a11y = getService('a11y');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');

  // https://github.com/elastic/kibana/issues/141724
  describe.skip('Observability UI', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      await PageObjects.common.navigateToApp('observability');
    });

    describe('Overview', async () => {
      before(async () => {
        await observability.overview.common.openAlertsSectionAndWaitToAppear();
        await a11y.testAppSnapshot();
      });
      it('Guided Setup', async () => {
        await PageObjects.infraHome.clickGuidedSetupButton();
        await retry.waitFor('Guided setup header to be visible', async () => {
          return await testSubjects.isDisplayed('statusVisualizationFlyoutTitle');
        });
        await a11y.testAppSnapshot();
      });
    });
  });
}
