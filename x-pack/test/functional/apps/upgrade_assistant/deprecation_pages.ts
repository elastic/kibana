/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { FtrProviderContext } from '../../ftr_provider_context';

const multiFieldsIndexDeprecation: estypes.IndicesCreateRequest = {
  index: 'nested_multi_fields',
  body: {
    mappings: {
      properties: {
        text: {
          type: 'text',
          fields: {
            english: {
              type: 'text',
              analyzer: 'english',
              fields: {
                english: {
                  type: 'text',
                  analyzer: 'english',
                },
              },
            },
          },
        },
      },
    },
  },
};

const translogSettingsIndexDeprecation: estypes.IndicesCreateRequest = {
  index: 'deprecated_settings',
  body: {
    settings: {
      // @ts-expect-error is not declared in the type definition
      'translog.retention.size': '1b',
      'translog.retention.age': '5m',
      'index.soft_deletes.enabled': true,
    },
  },
};

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

  describe.skip('Deprecation pages', function () {
    this.tags('skipFirefox');

    before(async () => {
      await security.testUser.setRoles(['global_upgrade_assistant_role']);

      try {
        // Create two indices that will trigger deprecation warnings to test the ES deprecations page
        await es.indices.create(multiFieldsIndexDeprecation);
        await es.indices.create(translogSettingsIndexDeprecation);
      } catch (e) {
        log.debug('[Setup error] Error creating indices');
        throw e;
      }
    });

    after(async () => {
      try {
        await es.indices.delete({
          index: [multiFieldsIndexDeprecation.index, translogSettingsIndexDeprecation.index],
        });
      } catch (e) {
        log.debug('[Cleanup error] Error deleting indices');
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

    it('renders the Kibana deprecations page', async () => {
      await PageObjects.upgradeAssistant.navigateToPage();
      await PageObjects.upgradeAssistant.clickKibanaDeprecationsPanel();

      await retry.waitFor('Kibana deprecations table to be visible', async () => {
        return testSubjects.exists('kibanaDeprecations');
      });
    });
  });
}
