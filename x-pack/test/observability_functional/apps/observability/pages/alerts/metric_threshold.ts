/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');

  describe('Metric threshold rule', function () {
    this.tags('includeFirefox');

    const observability = getService('observability');

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      await observability.alerts.common.navigateToRulesPage();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
    });

    it('shows the metric threshold rule in the observability section', async () => {
      await observability.alerts.rulesPage.clickCreateRuleButton();
      await observability.alerts.rulesPage.clickOnInfrastructureCategory();
      await observability.alerts.rulesPage.clickOnMetricThresholdRule();
    });

    it('shows an expression row in the condition section', async () => {
      await testSubjects.existOrFail('metricThresholdExpressionRow');
    });
  });
};
