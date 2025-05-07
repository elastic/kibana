/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* This test expects a deprecation which is valid only on 7.x. So, this is enabled on 7.x
 * and disabled on 8.x. Should be enabled again when 8.x to next major upgrade happens with
 * valid deprecations
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function upgradeAssistantPage({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['upgradeAssistant', 'common']);
  const a11y = getService('a11y');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const es = getService('es');
  const log = getService('log');

  // Failing: See https://github.com/elastic/kibana/issues/217262
  describe.skip('Upgrade Assistant Accessibility', function () {
    // Only run this test in 8 as the deprecation we are testing is only available in 8
    this.onlyEsVersion('8');

    before(async () => {
      await PageObjects.upgradeAssistant.navigateToPage();

      try {
        // Create an ES deprecation
        await es.cluster.putComponentTemplate({
          name: 'deprecated_template',
          template: {
            mappings: {
              _source: {
                mode: 'stored',
              },
            },
          },
        });
      } catch (e) {
        log.debug('[Setup error] Error creating indices');
        throw e;
      }
    });

    after(async () => {
      try {
        await es.cluster.deleteComponentTemplate({
          name: 'deprecated_template',
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

    describe('ES deprecations logs flyout', () => {
      beforeEach(async () => {
        await PageObjects.upgradeAssistant.navigateToPage();
      });

      it('with logs collection disabled', async () => {
        await PageObjects.upgradeAssistant.clickOpenEsDeprecationsFlyoutButton();
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
        await PageObjects.upgradeAssistant.clickOpenEsDeprecationsFlyoutButton();
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
