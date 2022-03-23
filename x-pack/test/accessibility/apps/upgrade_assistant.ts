/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesCreateRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { FtrProviderContext } from '../ftr_provider_context';

const translogSettingsIndexDeprecation: IndicesCreateRequest = {
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

const multiFieldsIndexDeprecation: IndicesCreateRequest = {
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

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['upgradeAssistant', 'common']);
  const a11y = getService('a11y');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const es = getService('es');
  const log = getService('log');

  describe.skip('Upgrade Assistant', () => {
    before(async () => {
      await PageObjects.upgradeAssistant.navigateToPage();

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
    });

    describe('Overview page', () => {
      beforeEach(async () => {
        await PageObjects.upgradeAssistant.navigateToPage();
        await retry.waitFor('Upgrade Assistant overview page to be visible', async () => {
          return testSubjects.exists('overview');
        });
      });

      it('has no accessibility issues', async () => {
        await a11y.testAppSnapshot();
      });
    });

    describe('ES deprecations logs page', () => {
      beforeEach(async () => {
        await PageObjects.upgradeAssistant.navigateToEsDeprecationLogs();
      });

      it('with logs collection disabled', async () => {
        const loggingEnabled = await PageObjects.upgradeAssistant.isDeprecationLoggingEnabled();
        if (loggingEnabled) {
          await PageObjects.upgradeAssistant.clickDeprecationLoggingToggle();
        }

        await retry.waitFor('Deprecation logging to be disabled', async () => {
          return !(await PageObjects.upgradeAssistant.isDeprecationLoggingEnabled());
        });
        await a11y.testAppSnapshot();
      });

      it('with logs collection enabled', async () => {
        const loggingEnabled = await PageObjects.upgradeAssistant.isDeprecationLoggingEnabled();
        if (!loggingEnabled) {
          await PageObjects.upgradeAssistant.clickDeprecationLoggingToggle();
        }

        await retry.waitFor('UA external links title to be present', async () => {
          return testSubjects.isDisplayed('externalLinksTitle');
        });

        await a11y.testAppSnapshot();
      });
    });

    describe('Elasticsearch deprecations page', () => {
      beforeEach(async () => {
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
      });

      it('Deprecations table', async () => {
        await a11y.testAppSnapshot();
      });

      it('Index settings deprecation flyout', async () => {
        await PageObjects.upgradeAssistant.clickEsDeprecation(
          'indexSettings' // An index setting deprecation was added in the before() hook so should be guaranteed
        );
        await retry.waitFor('ES index settings deprecation flyout to be visible', async () => {
          return testSubjects.exists('indexSettingsDetails');
        });
        await a11y.testAppSnapshot();
      });

      it('Default deprecation flyout', async () => {
        await PageObjects.upgradeAssistant.clickEsDeprecation(
          'default' // A default deprecation was added in the before() hook so should be guaranteed
        );
        await retry.waitFor('ES default deprecation flyout to be visible', async () => {
          return testSubjects.exists('defaultDeprecationDetails');
        });
        await a11y.testAppSnapshot();
      });
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
