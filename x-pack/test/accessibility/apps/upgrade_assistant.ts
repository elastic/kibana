/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesCreateRequest } from '@elastic/elasticsearch/api/types';
import { FtrProviderContext } from '../ftr_provider_context';

const translogSettingsIndexDeprecation: IndicesCreateRequest = {
  index: 'deprecated_settings',
  body: {
    settings: {
      'translog.retention.size': '1b',
      'translog.retention.age': '5m',
      'index.soft_deletes.enabled': true,
    },
  },
};

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['upgradeAssistant', 'common']);
  const a11y = getService('a11y');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const es = getService('es');
  const log = getService('log');

  describe('Upgrade Assistant', () => {
    before(async () => {
      await PageObjects.upgradeAssistant.navigateToPage();

      try {
        // Create an index that will trigger a deprecation warning to test the ES deprecations page
        await es.indices.create(translogSettingsIndexDeprecation);
      } catch (e) {
        log.debug('[Setup error] Error creating index');
        throw e;
      }
    });

    after(async () => {
      try {
        await es.indices.delete({
          index: [translogSettingsIndexDeprecation.index],
        });
      } catch (e) {
        log.debug('[Cleanup error] Error deleting index');
        throw e;
      }
    });

    it('Overview page', async () => {
      await retry.waitFor('Upgrade Assistant overview page to be visible', async () => {
        return testSubjects.exists('overview');
      });
      await a11y.testAppSnapshot();
    });

    it('Elasticsearch deprecations page', async () => {
      await PageObjects.common.navigateToUrl(
        'management',
        'stack/upgrade_assistant/es_deprecations',
        {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
          shouldUseHashForSubUrl: false,
        }
      );

      await retry.waitFor('Elasticsearch deprecations table to be visible', async () => {
        return testSubjects.exists('esDeprecationsTable');
      });

      await a11y.testAppSnapshot();
    });

    describe('Kibana deprecations page', () => {
      beforeEach(async () => {
        await PageObjects.common.navigateToUrl(
          'management',
          'stack/upgrade_assistant/kibana_deprecations',
          {
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
            shouldUseHashForSubUrl: false,
          }
        );

        await retry.waitFor('Kibana deprecations to be visible', async () => {
          return testSubjects.exists('kibanaDeprecations');
        });
      });

      it('Deprecations table', async () => {
        await a11y.testAppSnapshot();
      });

      it('Deprecation details flyout', async () => {
        await PageObjects.upgradeAssistant.clickKibanaDeprecation(
          'xpack.securitySolution has a deprecated setting' // This deprecation was added to the test runner config so should be guaranteed
        );

        await retry.waitFor('Kibana deprecation details flyout to be visible', async () => {
          return testSubjects.exists('kibanaDeprecationDetails');
        });

        await a11y.testAppSnapshot();
      });
    });
  });
}
