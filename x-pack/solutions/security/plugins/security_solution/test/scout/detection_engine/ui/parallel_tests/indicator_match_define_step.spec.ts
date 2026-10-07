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

    spaceTest('index patterns: contains the default index patterns', async ({ pageObjects }) => {
      await expect(pageObjects.threatMatchRuleCreatePage.ruleIndexInput).toHaveText(
        DEFAULT_SECURITY_SOLUTION_INDEXES.join('')
      );
    });

    spaceTest(
      'index patterns: does not show the index pattern error when the indicator index is filled out',
      async ({ pageObjects }) => {
        const { threatMatchRuleCreatePage } = pageObjects;
        await threatMatchRuleCreatePage.continueFromDefineStep();
        // The mapping is still empty, which proves validation ran
        await expect(threatMatchRuleCreatePage.atLeastOneMatchMessage).toBeVisible();
        await expect(threatMatchRuleCreatePage.atLeastOneIndexPatternMessage).toBeHidden();
      }
    );

    spaceTest(
      'index patterns: shows the index pattern error when continuing without index patterns',
      async ({ pageObjects }) => {
        const { threatMatchRuleCreatePage } = pageObjects;
        await threatMatchRuleCreatePage.clearRuleIndexPatterns();
        await threatMatchRuleCreatePage.clearIndicatorIndexPatterns();
        await threatMatchRuleCreatePage.continueFromDefineStep();
        await expect(threatMatchRuleCreatePage.atLeastOneIndexPatternMessage).not.toHaveCount(0);
      }
    );

    spaceTest(
      'indicator index patterns: contains the default indicator index pattern',
      async ({ pageObjects }) => {
        await expect(pageObjects.threatMatchRuleCreatePage.indicatorIndexInput).toHaveText(
          DEFAULT_THREAT_INDEX_PATTERNS.join('')
        );
      }
    );

    spaceTest(
      'indicator index patterns: does not show the index pattern error on initial page load',
      async ({ pageObjects }) => {
        const { threatMatchRuleCreatePage } = pageObjects;
        await expect(threatMatchRuleCreatePage.indicatorIndexInput).toHaveText(
          DEFAULT_THREAT_INDEX_PATTERNS.join('')
        );
        await expect(threatMatchRuleCreatePage.atLeastOneIndexPatternMessage).toBeHidden();
      }
    );

    spaceTest(
      'indicator index patterns: shows the index pattern error when continuing without an indicator index',
      async ({ pageObjects }) => {
        const { threatMatchRuleCreatePage } = pageObjects;
        await threatMatchRuleCreatePage.clearIndicatorIndexPatterns();
        await threatMatchRuleCreatePage.continueFromDefineStep();
        await expect(threatMatchRuleCreatePage.atLeastOneIndexPatternMessage).toBeVisible();
      }
    );

    spaceTest('custom query input: defaults to *:*', async ({ pageObjects }) => {
      await expect(pageObjects.threatMatchRuleCreatePage.customQueryInput).toHaveText('*:*');
    });

    spaceTest(
      'custom query input: shows an error when the query is removed',
      async ({ pageObjects }) => {
        const { threatMatchRuleCreatePage } = pageObjects;
        await threatMatchRuleCreatePage.clearQuery(threatMatchRuleCreatePage.customQueryInput);
        await expect(threatMatchRuleCreatePage.customQueryRequiredMessage).toBeVisible();
      }
    );

    spaceTest(
      'indicator query input: defaults to the last 30 days filter',
      async ({ pageObjects }) => {
        await expect(pageObjects.threatMatchRuleCreatePage.indicatorQueryInput).toHaveText(
          DEFAULT_THREAT_MATCH_QUERY
        );
      }
    );

    spaceTest(
      'indicator query input: shows an error when the query is removed',
      async ({ pageObjects }) => {
        const { threatMatchRuleCreatePage } = pageObjects;
        await threatMatchRuleCreatePage.clearQuery(threatMatchRuleCreatePage.indicatorQueryInput);
        await expect(threatMatchRuleCreatePage.indicatorQueryRequiredMessage).toBeVisible();
      }
    );

    spaceTest(
      'schedule step: defaults to a 1h interval and 5m lookback',
      async ({ pageObjects }) => {
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
      }
    );
  }
);
