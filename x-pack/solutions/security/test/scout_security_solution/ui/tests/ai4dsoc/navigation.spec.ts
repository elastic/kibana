/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../fixtures';
import { GET_STARTED_URL } from '../../common/urls';

// FLAKY: https://github.com/elastic/kibana/issues/242988
test.describe.skip(
  'AI4dSoC Navigation',
  { tag: [...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.ai4dsoc.goto(GET_STARTED_URL);
    });

    test.describe('renders links correctly', () => {
      const visibleLinks = [
        'alert_summary',
        'attack_discovery',
        'cases',
        'configurations',
        'discover',
      ];
      const notVisibleLinks = [
        'securityGroup:rules',
        'alerts',
        'cloud_security_posture-findings',
        'threat_intelligence',
        'securityGroup:explore',
        'securityGroup:assets',
        'securityGroup:machine_learning',
        'rules',
      ];

      test('should contain the specified links', async ({ pageObjects }) => {
        await expect(pageObjects.ai4dsoc.aiSocNavigation.first()).toBeVisible();
        for (const link of visibleLinks) {
          await expect(pageObjects.ai4dsoc.navItemLocator(link).first()).toBeVisible();
        }
        for (const link of notVisibleLinks) {
          await expect(pageObjects.ai4dsoc.navItemLocator(link).first()).not.toBeAttached();
        }
      });
    });
  }
);
