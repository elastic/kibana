/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { setTimeout } from 'timers/promises';
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

  describe('Deprecation pages', function () {
    this.tags('skipFirefox');

    before(async () => {
      await security.testUser.setRoles(['superuser']);

      // Cluster readiness checks
      try {
        // Trigger "Total shards" ES Upgrade readiness check
        await es.cluster.putSettings({
          body: {
            persistent: {
              cluster: {
                max_shards_per_node: '9',
              },
            },
          },
        });

        // Trigger "Low disk watermark" ES Upgrade readiness check
        await es.cluster.putSettings({
          body: {
            persistent: {
              cluster: {
                // push allocation changes to nodes quickly during tests
                info: {
                  update: { interval: '10s' },
                },
                routing: {
                  allocation: {
                    disk: {
                      threshold_enabled: true,
                      watermark: { low: '30%' },
                    },
                  },
                },
              },
            },
          },
        });

        // Wait for the cluster settings to be reflected to the ES nodes
        await setTimeout(12000);
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
                info: {
                  update: { interval: null },
                },
                max_shards_per_node: null,
                routing: {
                  allocation: {
                    disk: {
                      threshold_enabled: false,
                      watermark: { low: null },
                    },
                  },
                },
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

      expect(deprecationMessages).to.contain('Disk usage exceeds low watermark');
      expect(deprecationMessages).to.contain(
        'The cluster has too many shards to be able to upgrade'
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
