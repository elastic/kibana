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
    spaceTest.beforeEach(async ({ browserAuth, kbnUrl, scoutSpace, pageObjects }) => {
      await browserAuth.loginAsPlatformEngineer();
      const { threatMatchRuleCreatePage } = pageObjects;
      await threatMatchRuleCreatePage.gotoCreateIndicatorMatchRule({
        kbnUrl,
        spaceId: scoutSpace.id,
      });
      await threatMatchRuleCreatePage.setIndexPatterns({
        index: INDEX_PATTERNS,
        threatIndex: THREAT_INDEX_PATTERNS,
      });
    });

    spaceTest(
      'shows invalidation text when continuing without filling anything out',
      async ({ pageObjects }) => {
        const { threatMatchRuleCreatePage } = pageObjects;
        await threatMatchRuleCreatePage.continueFromDefineStep();
        await expect(threatMatchRuleCreatePage.atLeastOneMatchMessage).toBeVisible();
      }
    );

    spaceTest(
      'shows invalidation text when the AND button is pressed and both mappings are blank',
      async ({ pageObjects }) => {
        const { threatMatchRuleCreatePage } = pageObjects;
        await threatMatchRuleCreatePage.addAndRow();
        await expect(threatMatchRuleCreatePage.invalidMappingMessage).toBeVisible();
      }
    );

    spaceTest(
      'shows invalidation text when the OR button is pressed and both mappings are blank',
      async ({ pageObjects }) => {
        const { threatMatchRuleCreatePage } = pageObjects;
        await threatMatchRuleCreatePage.addOrRow();
        await expect(threatMatchRuleCreatePage.invalidMappingMessage).toBeVisible();
      }
    );

    spaceTest(
      'does not show invalidation text with a valid index field and a valid indicator index field',
      async ({ pageObjects }) => {
        const { threatMatchRuleCreatePage } = pageObjects;
        await threatMatchRuleCreatePage.fillMappingRow({
          indexField: VALID_INDEX_FIELD,
          indicatorField: VALID_INDICATOR_FIELD,
        });
        await threatMatchRuleCreatePage.continueFromDefineStep();
        await expect(threatMatchRuleCreatePage.defineEditButton).toBeVisible();
        await expect(threatMatchRuleCreatePage.invalidMappingMessage).toBeHidden();
      }
    );

    spaceTest(
      'shows invalidation text with an invalid index field and a valid indicator index field',
      async ({ pageObjects }) => {
        const { threatMatchRuleCreatePage } = pageObjects;
        await threatMatchRuleCreatePage.fillMappingRow({
          indexField: 'non-existent-value',
          indicatorField: VALID_INDICATOR_FIELD,
          selectIndexField: false,
        });
        await threatMatchRuleCreatePage.continueFromDefineStep();
        await expect(threatMatchRuleCreatePage.invalidMappingMessage).toBeVisible();
      }
    );

    spaceTest(
      'shows invalidation text with a valid index field and an invalid indicator index field',
      async ({ pageObjects }) => {
        const { threatMatchRuleCreatePage } = pageObjects;
        await threatMatchRuleCreatePage.fillMappingRow({
          indexField: VALID_INDEX_FIELD,
          indicatorField: 'non-existent-value',
          selectIndicatorField: false,
        });
        await threatMatchRuleCreatePage.continueFromDefineStep();
        await expect(threatMatchRuleCreatePage.invalidMappingMessage).toBeVisible();
      }
    );
  }
);
