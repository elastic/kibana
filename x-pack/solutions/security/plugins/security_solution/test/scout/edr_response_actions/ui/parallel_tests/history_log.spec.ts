/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import { spaceTest, tags } from '../fixtures';
import { getResponseActionsAccessRole } from '../fixtures/response_actions_access_role';
import {
  seedResponseActionsHistory,
  type SeededResponseActionsHistory,
} from '../fixtures/seed_response_actions_history';

const TRIGGERED_BY_RULE = 'Triggered by rule';
const TRIGGERED_MANUALLY = 'Triggered manually';

const requireSeededHistory = (
  seeded: SeededResponseActionsHistory | undefined
): SeededResponseActionsHistory => {
  if (!seeded) {
    throw new Error('Response action history data was not seeded');
  }
  return seeded;
};

spaceTest.describe(
  'Response actions history page',
  {
    // Stateful only. The Cypress spec was `@brokenInServerless` for this role.
    tag: tags.stateful.classic,
  },
  () => {
    let seeded: SeededResponseActionsHistory | undefined;

    spaceTest.beforeAll(async ({ esClient, kbnClient, scoutSpace, config }) => {
      // Endpoint host indexing installs Fleet and waits on metadata transforms.
      spaceTest.setTimeout(600_000);
      await scoutSpace.setSolutionView('security');
      seeded = await seedResponseActionsHistory({
        esClient,
        kbnClient,
        spaceId: scoutSpace.id,
        config,
      });
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginWithCustomRole(getResponseActionsAccessRole());
    });

    spaceTest.afterAll(async () => {
      await seeded?.cleanup();
    });

    spaceTest(
      'filters response actions by trigger type and opens the linked rule',
      async ({ page, pageObjects }) => {
        const history = requireSeededHistory(seeded);

        const { responseActionsHistory } = pageObjects;
        const rows = responseActionsHistory.dataRows();

        await spaceTest.step('open history scoped to the seeded hosts', async () => {
          // The response-actions index is deployment-wide. Scope the page to
          // the hosts this test created so other suites cannot change the rows.
          await responseActionsHistory.goto(history.agentIds);
          // A host can have several actions. Wait until each seeded host has a row,
          // without requiring the hostname cell to be unique.
          await expect(rows.filter({ hasText: history.manualHostname })).not.toHaveCount(0);
          await expect(rows.filter({ hasText: history.automatedHostname })).not.toHaveCount(0);
        });

        const totalRows = await rows.count();

        await spaceTest.step('filter to actions triggered by a rule', async () => {
          await responseActionsHistory.toggleTypeFilter(TRIGGERED_BY_RULE);
          await expect(rows.filter({ hasText: TRIGGERED_BY_RULE })).not.toHaveCount(0);
          await expect(rows.filter({ hasNotText: TRIGGERED_BY_RULE })).toHaveCount(0);
          await expect(
            rows
              .filter({ hasText: history.automatedHostname })
              .filter({ hasText: TRIGGERED_BY_RULE })
          ).not.toHaveCount(0);
        });

        await spaceTest.step('clear the rule filter', async () => {
          await responseActionsHistory.toggleTypeFilter(TRIGGERED_BY_RULE);
          await expect(rows).toHaveCount(totalRows);
        });

        await spaceTest.step('filter to actions triggered manually', async () => {
          await responseActionsHistory.toggleTypeFilter(TRIGGERED_MANUALLY);
          await expect(rows.filter({ hasText: TRIGGERED_BY_RULE })).toHaveCount(0);
          // The manual host asks for 2 actions and can get up to 6. The
          // automated host stays at 1, so this filter is every row except that one.
          await expect(rows).toHaveCount(totalRows - 1);
        });

        await spaceTest.step('open the rule that triggered the action', async () => {
          await responseActionsHistory.toggleTypeFilter(TRIGGERED_MANUALLY);
          await responseActionsHistory.toggleTypeFilter(TRIGGERED_BY_RULE);
          await responseActionsHistory.ruleLinkForHost(history.automatedHostname).click();
          await expect(page).toHaveURL(new RegExp(`/id/${history.ruleId}`));
          // Solution navigation uses the project header, so this checks that the
          // rules page mounted. The seeded id is the generator literal
          // `generated_rule_id`, not a saved rule. The Cypress breadcrumb check
          // had the same limit.
          await expect(page.testSubj.locator('header-page')).toBeVisible();
        });
      }
    );
  }
);
