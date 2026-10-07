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
  INDICATOR_MATCH_INDICATOR_FIELD,
} from '../fixtures/indicator_match_rule';

const RULE = getIndicatorMatchRule();
const REFERENCES = ['http://example.com/', 'https://example.com/'];
const FALSE_POSITIVES = ['False1', 'False2'];
const TAGS = ['test', 'threat'];
const INVESTIGATION_NOTE = '# test markdown';
// The source event of the `suspicious_source_event` archive is from 2021, so the first run needs
// a lookback of several years.
const LOOKBACK = { amount: '10000', unit: 'd' };

spaceTest.describe(
  'Indicator match rule creation: create and enable',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest.setTimeout(5 * 60_000);

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterEach(async ({ apiServices }) => {
      await apiServices.detectionRule.deleteAll();
      await apiServices.detectionAlerts.deleteAll();
    });

    spaceTest(
      'creates and enables an Indicator match rule that generates an alert',
      async ({ page, kbnUrl, scoutSpace, apiServices, pageObjects }) => {
        const {
          threatMatchRuleCreatePage,
          ruleCreateWizard,
          rulesManagementPage,
          ruleDetailsPage,
        } = pageObjects;

        await spaceTest.step('fill the define step', async () => {
          await threatMatchRuleCreatePage.gotoCreateIndicatorMatchRule({
            kbnUrl,
            spaceId: scoutSpace.id,
          });
          await threatMatchRuleCreatePage.setIndexPatterns({
            index: RULE.index,
            threatIndex: RULE.threat_index,
          });
          await threatMatchRuleCreatePage.fillMappingRow({
            indexField: INDICATOR_MATCH_INDEX_FIELD,
            indicatorField: INDICATOR_MATCH_INDICATOR_FIELD,
          });
          await threatMatchRuleCreatePage.setQuery(
            threatMatchRuleCreatePage.indicatorQueryInput,
            RULE.threat_query
          );
          await threatMatchRuleCreatePage.continueFromDefineStep();
        });

        await spaceTest.step('fill the about step', async () => {
          // The form stays disabled while the app initializes user info and lists for a new space
          await expect(ruleCreateWizard.aboutRuleName).toBeEnabled({ timeout: 60_000 });
          await ruleCreateWizard.aboutRuleName.fill(RULE.name);
          await ruleCreateWizard.aboutRuleDescription.fill(RULE.description);
          await ruleCreateWizard.selectSeverity('Critical');
          await ruleCreateWizard.aboutRiskScoreInput.fill(String(RULE.risk_score));
          await ruleCreateWizard.addTags(TAGS);
          await ruleCreateWizard.expandAdvancedSettings();
          await ruleCreateWizard.addReferenceUrls(REFERENCES);
          await ruleCreateWizard.addFalsePositives(FALSE_POSITIVES);
          await ruleCreateWizard.aboutInvestigationNote.fill(INVESTIGATION_NOTE);
          await ruleCreateWizard.aboutContinue.click();
        });

        await spaceTest.step('fill the schedule step and create the rule', async () => {
          await ruleCreateWizard.setSchedule({
            interval: { amount: '100', unit: 'm' },
            lookback: LOOKBACK,
          });
          await ruleCreateWizard.scheduleContinue.click();
          await ruleCreateWizard.createAndEnableRule();
        });

        await spaceTest.step('the rules table lists the enabled rule', async () => {
          await rulesManagementPage.goto({ kbnUrl, spaceId: scoutSpace.id });
          await expect(rulesManagementPage.customRulesFilter).toHaveText('Custom rules (1)');
          const row = rulesManagementPage.ruleRow(RULE.name);
          await expect(row).toBeVisible();
          await expect(row.locator('[data-test-subj="riskScore"]')).toHaveText(
            String(RULE.risk_score)
          );
          await expect(row.locator('[data-test-subj="severity"]')).toHaveText('Critical');
          await expect(rulesManagementPage.ruleSwitch(RULE.name)).toHaveAttribute(
            'aria-checked',
            'true'
          );
        });

        await spaceTest.step('the rule details show what was entered', async () => {
          await rulesManagementPage.openRuleDetails(RULE.name);
          await expect(ruleDetailsPage.header).toContainText(RULE.name);
          await expect(ruleDetailsPage.description).toHaveText(RULE.description);

          const { aboutSection, definitionSection, scheduleSection } = ruleDetailsPage;
          await expect(ruleDetailsPage.detailValue(aboutSection, 'Severity')).toHaveText(
            'Critical'
          );
          await expect(ruleDetailsPage.detailValue(aboutSection, 'Risk score')).toHaveText(
            String(RULE.risk_score)
          );
          await expect(
            ruleDetailsPage.detailValue(aboutSection, 'Indicator prefix override')
          ).toHaveText(String(RULE.threat_indicator_path));
          for (const reference of REFERENCES) {
            await expect(ruleDetailsPage.detailValue(aboutSection, 'Reference URLs')).toContainText(
              reference
            );
          }
          await expect(
            ruleDetailsPage.detailValue(aboutSection, 'False positive examples')
          ).toHaveText(FALSE_POSITIVES.join(''));
          await expect(ruleDetailsPage.detailValue(aboutSection, 'Tags')).toHaveText(TAGS.join(''));
          await ruleDetailsPage.investigationNotesToggle.click();
          await expect(ruleDetailsPage.investigationNotes).toHaveText('test markdown');

          await expect(ruleDetailsPage.detailValue(definitionSection, 'Index patterns')).toHaveText(
            RULE.index.join('')
          );
          await expect(ruleDetailsPage.detailValue(definitionSection, 'Custom query')).toHaveText(
            '*:*'
          );
          await expect(ruleDetailsPage.detailValue(definitionSection, 'Rule type')).toHaveText(
            'Indicator Match'
          );
          await expect(
            ruleDetailsPage.detailValue(definitionSection, 'Timeline template')
          ).toHaveText('None');
          await expect(
            ruleDetailsPage.detailValue(definitionSection, 'Indicator index patterns')
          ).toHaveText(RULE.threat_index.join(''));
          await expect(
            ruleDetailsPage.detailValue(definitionSection, 'Indicator mapping')
          ).toHaveText(`${INDICATOR_MATCH_INDEX_FIELD} MATCHES ${INDICATOR_MATCH_INDICATOR_FIELD}`);
          await expect(
            ruleDetailsPage.detailValue(definitionSection, 'Indicator index query')
          ).toHaveText('*:*');
          await expect(
            ruleDetailsPage
              .detailValue(scheduleSection, 'Runs every')
              .locator('[data-test-subj="interval-abbr-value"]')
          ).toHaveText(String(RULE.interval));
        });

        await spaceTest.step('the rule runs and generates an alert', async () => {
          await apiServices.detectionAlerts.waitForAlerts(RULE.name, 1, 180_000);
          await ruleDetailsPage.openAlertsTab();
          await page.reload();
          await expect(ruleDetailsPage.alertsCount).toHaveText('1 alert');
          await expect(ruleDetailsPage.alertRuleNameCells).toHaveText([RULE.name]);
          await expect(ruleDetailsPage.alertSeverityCells).toHaveText(['critical']);
          await expect(ruleDetailsPage.alertRiskScoreCells).toHaveText([String(RULE.risk_score)]);
        });
      }
    );
  }
);
