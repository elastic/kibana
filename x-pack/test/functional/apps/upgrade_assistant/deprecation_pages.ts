/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function upgradeAssistantFunctionalTests({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const PageObjects = getPageObjects(['upgradeAssistant', 'common']);
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const es = getService('es');
  const security = getService('security');
  const log = getService('log');

  // Failing: See https://github.com/elastic/kibana/issues/167090
  describe.skip('Deprecation pages', function () {
    this.tags(['skipFirefox', 'upgradeAssistant']);

    before(async () => {
      await security.testUser.setRoles(['superuser']);
      try {
        /**
         * Trigger "Total shards" ES Upgrade readiness check
         * the number of shards in the test cluster is 25-29
         * so 5 max shards per node should trigger this check
         * on both local and CI environments.
         */
        await es.cluster.putSettings({
          body: {
            persistent: {
              cluster: {
                max_shards_per_node: 5,
              },
            },
          },
        });
      } catch (e) {
        log.debug('[Setup error] Error updating cluster settings');
        throw e;
      }
    });

    after(async () => {
      try {
        await es.cluster.putSettings({
          body: {
            persistent: {
              cluster: {
                // initial cluster setting from x-pack/test/functional/config.upgrade_assistant.js
                max_shards_per_node: 29,
              },
            },
          },
        });
      } catch (e) {
        log.debug('[Cleanup error] Error reseting cluster settings');
        throw e;
      }
      await security.testUser.restoreDefaults();
    });

    it('renders the Elasticsearch deprecations page', async () => {
      await PageObjects.upgradeAssistant.navigateToPage();
      await PageObjects.upgradeAssistant.clickEsDeprecationsPanel();

      await retry.waitFor('Elasticsearch deprecations table to be visible', async () => {
        return testSubjects.exists('esDeprecationsTable');
      });
    });

    it('renders the Elasticsearch upgrade readiness deprecations', async () => {
      const deprecationMessages = await testSubjects.getVisibleTextAll('defaultTableCell-message');
      const healthIndicatorsCriticalMessages = await testSubjects.getVisibleTextAll(
        'healthIndicatorTableCell-message'
      );

      expect(deprecationMessages).to.contain('Disk usage exceeds low watermark');
      expect(healthIndicatorsCriticalMessages).to.contain(
        'Elasticsearch is about to reach the maximum number of shards it can host, based on your current settings.'
      );
    });

    it('renders the Kibana deprecations page', async () => {
      await PageObjects.upgradeAssistant.navigateToPage();
      await PageObjects.upgradeAssistant.clickKibanaDeprecationsPanel();

      await retry.waitFor('Kibana deprecations table to be visible', async () => {
        return testSubjects.exists('kibanaDeprecations');
      });
    });
  });
}
