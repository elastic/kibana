/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SECURITY_SOLUTION_INDEXES, spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

const DEFAULT_THREAT_INDEX_PATTERNS = ['logs-ti_*'];
const DEFAULT_THREAT_MATCH_QUERY = '@timestamp >= "now-30d/d"';
const VALID_INDEX_FIELD = 'myhash.mysha256';
const VALID_INDICATOR_FIELD = 'threat.indicator.file.hash.sha256';

spaceTest.describe(
  'Indicator match rule creation: define step',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth, kbnUrl, scoutSpace, pageObjects }) => {
      await browserAuth.loginAsPlatformEngineer();
      await pageObjects.threatMatchRuleCreatePage.gotoCreateIndicatorMatchRule({
        kbnUrl,
        spaceId: scoutSpace.id,
      });
    });

    spaceTest('validates the index patterns and the queries', async ({ pageObjects }) => {
      const { threatMatchRuleCreatePage } = pageObjects;

      await spaceTest.step('shows the default index patterns and queries', async () => {
        await expect(threatMatchRuleCreatePage.ruleIndexInput).toHaveText(
          DEFAULT_SECURITY_SOLUTION_INDEXES.join('')
        );
        await expect(threatMatchRuleCreatePage.indicatorIndexInput).toHaveText(
          DEFAULT_THREAT_INDEX_PATTERNS.join('')
        );
        await expect(threatMatchRuleCreatePage.customQueryInput).toHaveText('*:*');
        await expect(threatMatchRuleCreatePage.indicatorQueryInput).toHaveText(
          DEFAULT_THREAT_MATCH_QUERY
        );
      });

      await spaceTest.step('requires an indicator mapping, not index patterns', async () => {
        await threatMatchRuleCreatePage.continueFromDefineStep();
        // The mapping is still empty, which proves validation ran
        await expect(threatMatchRuleCreatePage.atLeastOneMatchMessage).toBeVisible();
        await expect(threatMatchRuleCreatePage.atLeastOneIndexPatternMessage).toBeHidden();
      });

      await spaceTest.step('requires a custom query', async () => {
        await threatMatchRuleCreatePage.clearQuery(threatMatchRuleCreatePage.customQueryInput);
        await expect(threatMatchRuleCreatePage.customQueryRequiredMessage).toBeVisible();
      });

      await spaceTest.step('requires an indicator query', async () => {
        await threatMatchRuleCreatePage.clearQuery(threatMatchRuleCreatePage.indicatorQueryInput);
        await expect(threatMatchRuleCreatePage.indicatorQueryRequiredMessage).toBeVisible();
      });

      await spaceTest.step('requires index patterns', async () => {
        await threatMatchRuleCreatePage.clearRuleIndexPatterns();
        await threatMatchRuleCreatePage.continueFromDefineStep();
        await expect(threatMatchRuleCreatePage.atLeastOneIndexPatternMessage).toHaveCount(1);

        await threatMatchRuleCreatePage.clearIndicatorIndexPatterns();
        await threatMatchRuleCreatePage.continueFromDefineStep();
        await expect(threatMatchRuleCreatePage.atLeastOneIndexPatternMessage).toHaveCount(2);
      });
    });

    spaceTest('defaults the schedule to a 1h interval and 5m lookback', async ({ pageObjects }) => {
      const { threatMatchRuleCreatePage, ruleCreateWizard } = pageObjects;
      await threatMatchRuleCreatePage.setIndexPatterns({
        index: ['auditbeat-suspicious-*'],
        threatIndex: ['filebeat-*'],
      });
      await threatMatchRuleCreatePage.fillMappingRow({
        indexField: VALID_INDEX_FIELD,
        indicatorField: VALID_INDICATOR_FIELD,
      });
      await threatMatchRuleCreatePage.continueFromDefineStep();

      await ruleCreateWizard.aboutRuleName.fill('Indicator match schedule defaults');
      await ruleCreateWizard.aboutRuleDescription.fill('Checks the schedule defaults');
      await ruleCreateWizard.aboutContinue.click();

      await expect(threatMatchRuleCreatePage.scheduleIntervalAmount).toHaveValue('1');
      await expect(threatMatchRuleCreatePage.scheduleIntervalUnit).toHaveValue('h');
      await expect(threatMatchRuleCreatePage.scheduleLookbackAmount).toHaveValue('5');
      await expect(threatMatchRuleCreatePage.scheduleLookbackUnit).toHaveValue('m');
    });
  }
);
