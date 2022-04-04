/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');

  const supertest = getService('supertest');
  const config = getService('config');
  const retry = getService('retry');

  // const objectRemover = new ObjectRemover(supertest);

  describe('Observability rules pages', function () {
    this.tags('includeFirefox');

    const observability = getService('observability');

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
      await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      await observability.alerts.common.navigateToTimeWithData();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
      await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
    });

    describe('Feature flag', () => {
      // Related to the config inside x-pack/test/observability_functional/with_rac_write.config.ts
      it('Link point to O11y Rules pages by default or when "xpack.observability.unsafe.rules.enabled: true"', async () => {
        const manageRulesPageHref = await observability.alerts.rulesPage.getManageRulesPageHref();
        expect(new URL(manageRulesPageHref).pathname).equal('/app/observability/alerts/rules');
      });
    });
    describe('Create rules', () => {
      it('Create Rules button is visible when user has permissions', async () => {
        await observability.alerts.rulesPage.goToMangeRulesPage();
        await retry.waitFor(
          'Create Rule button is visible',
          async () => await observability.alerts.rulesPage.getCreateRuleButton()
        );
      });
    });
  });
};
