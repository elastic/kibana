/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import {
  getIndicatorMatchRule,
  INDICATOR_MATCH_INDEX_FIELD,
  MATCHING_INDICATOR_ATOMIC,
} from '../fixtures/indicator_match_rule';

const RULE_NAME = 'Indicator match alert in timeline';

spaceTest.describe(
  'Indicator match alert: investigate in timeline',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let ruleId: string;

    spaceTest.setTimeout(5 * 60_000);

    spaceTest.beforeEach(async ({ browserAuth, apiServices, kbnClient, scoutSpace }) => {
      await kbnClient.request({
        method: 'POST',
        path: `/s/${scoutSpace.id}/api/timeline/_prepackaged`,
        headers: { 'elastic-api-version': '2023-10-31' },
      });
      ({ id: ruleId } = await apiServices.detectionRule.createThreatMatchRule(
        getIndicatorMatchRule({ name: RULE_NAME, rule_id: 'rule_testing', enabled: true })
      ));
      await apiServices.detectionAlerts.waitForAlerts(RULE_NAME, 1, 180_000);
      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterEach(async ({ apiServices }) => {
      await apiServices.detectionRule.deleteAll();
      await apiServices.detectionAlerts.deleteAll();
    });

    spaceTest(
      'shows the indicator match enrichment of the alert in the timeline',
      async ({ page, kbnUrl, scoutSpace, pageObjects }) => {
        const { ruleDetailsPage } = pageObjects;

        await spaceTest.step('open the alert in a timeline', async () => {
          await ruleDetailsPage.goto({ kbnUrl, spaceId: scoutSpace.id, ruleId, tab: 'alerts' });
          await expect(ruleDetailsPage.investigateInTimelineButtons).toHaveCount(1);
          await ruleDetailsPage.investigateInTimelineButtons.dispatchEvent('click');
        });

        await spaceTest.step('the timeline shows the matched indicator', async () => {
          const providers = page.testSubj.locator('providerBadge');
          await expect(providers).toHaveText([
            `threat.enrichments.matched.atomic: "${MATCHING_INDICATOR_ATOMIC}"`,
            'threat.enrichments.matched.type: "indicator_match_rule"',
            `threat.enrichments.matched.field: "${INDICATOR_MATCH_INDEX_FIELD}"`,
          ]);
          await expect(page.testSubj.locator('threat-match-row')).toHaveText(
            `${INDICATOR_MATCH_INDEX_FIELD}matched${MATCHING_INDICATOR_ATOMIC}indicator_match_ruleprovided byAbuseCH malware`
          );
        });
      }
    );
  }
);
