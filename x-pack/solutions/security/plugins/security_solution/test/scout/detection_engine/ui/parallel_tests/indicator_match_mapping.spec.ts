/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

const INDEX_PATTERNS = ['auditbeat-suspicious-*'];
const THREAT_INDEX_PATTERNS = ['filebeat-*'];

const VALID_INDEX_FIELD = 'myhash.mysha256';
const VALID_INDICATOR_FIELD = 'threat.indicator.file.hash.sha256';

spaceTest.describe(
  'Indicator match rule creation: indicator mapping',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    // Each step opens a fresh form, which makes the whole test longer than the default timeout
    spaceTest.setTimeout(3 * 60_000);

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest(
      'validates the indicator mapping when continuing',
      async ({ kbnUrl, scoutSpace, pageObjects }) => {
        const { threatMatchRuleCreatePage } = pageObjects;

        // Used to open the form for every step, otherwise a message from an earlier step makes later assertions pass
        const openForm = async () => {
          await threatMatchRuleCreatePage.gotoCreateIndicatorMatchRule({
            kbnUrl,
            spaceId: scoutSpace.id,
          });
          await threatMatchRuleCreatePage.setIndexPatterns({
            index: INDEX_PATTERNS,
            threatIndex: THREAT_INDEX_PATTERNS,
          });
        };

        await spaceTest.step(
          'requires a mapping when continuing without filling anything',
          async () => {
            await openForm();
            await threatMatchRuleCreatePage.continueFromDefineStep();
            await expect(threatMatchRuleCreatePage.atLeastOneMatchMessage).toBeVisible();
          }
        );

        await spaceTest.step('rejects blank mappings when the AND button is pressed', async () => {
          await openForm();
          await threatMatchRuleCreatePage.addAndRow();
          await expect(threatMatchRuleCreatePage.invalidMappingMessage).toBeVisible();
        });

        await spaceTest.step('rejects blank mappings when the OR button is pressed', async () => {
          await openForm();
          await threatMatchRuleCreatePage.addOrRow();
          await expect(threatMatchRuleCreatePage.invalidMappingMessage).toBeVisible();
        });

        await spaceTest.step('accepts a valid index field and indicator index field', async () => {
          await openForm();
          await threatMatchRuleCreatePage.fillMappingRow({
            indexField: VALID_INDEX_FIELD,
            indicatorField: VALID_INDICATOR_FIELD,
          });
          await threatMatchRuleCreatePage.continueFromDefineStep();
          await expect(threatMatchRuleCreatePage.defineEditButton).toBeVisible();
          await expect(threatMatchRuleCreatePage.invalidMappingMessage).toBeHidden();
        });

        await spaceTest.step('rejects an invalid index field', async () => {
          await openForm();
          await threatMatchRuleCreatePage.fillMappingRow({
            indexField: 'non-existent-value',
            indicatorField: VALID_INDICATOR_FIELD,
            pickIndexFieldSuggestion: false,
          });
          await threatMatchRuleCreatePage.continueFromDefineStep();
          await expect(threatMatchRuleCreatePage.invalidMappingMessage).toBeVisible();
        });

        await spaceTest.step('rejects an invalid indicator index field', async () => {
          await openForm();
          await threatMatchRuleCreatePage.fillMappingRow({
            indexField: VALID_INDEX_FIELD,
            indicatorField: 'non-existent-value',
            pickIndicatorFieldSuggestion: false,
          });
          await threatMatchRuleCreatePage.continueFromDefineStep();
          await expect(threatMatchRuleCreatePage.invalidMappingMessage).toBeVisible();
        });
      }
    );
  }
);
