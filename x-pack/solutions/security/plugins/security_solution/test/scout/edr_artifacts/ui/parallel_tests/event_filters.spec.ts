/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import { expect } from '@kbn/scout-security/ui';
import { spaceTest } from '../fixtures';
import type { ArtifactTabTestFixtures, ArtifactTabWorkerFixtures } from '../fixtures';
import { ARTIFACT_LIST_PAGE_TAGS, describeArtifactListPage } from '../fixtures/artifact_list_suite';
import { describeArtifactTabPolicyDetails } from '../fixtures/artifact_tabs_suite';
import { getArtifactTabCase } from '../fixtures/artifact_tabs_test_data';

const eventFilters = getArtifactTabCase('eventFilters');

// This is the only spec file that writes the agnostic `endpoint_event_filters`
// list, so it owns the shared-list suites: they wipe the list and assert on
// the empty states, which the item-scoped suites cannot.
describeArtifactTabPolicyDetails(eventFilters);
describeArtifactListPage(eventFilters, { minimalWriteRole: true });

const { pagePrefix, listId, listType, osTypes, entries } = eventFilters;
const SEEDED_VALUE = 'notepad.exe';
const EDITED_VALUE = `${SEEDED_VALUE}.lnk`;
// Not the value `global.setup.ts` seeds, so a `notepad.exe` option can only be
// a real suggestion and not the selected value the combo box re-adds.
const NOT_SEEDED_VALUE = 'cmd.exe';
const NO_MATCH_VALUE = 'aaaaaaaaaaaaaa as custom input';

/**
 * The suggestion expected once the value is cleared. Cloud data streams can
 * hold many other values and only the top terms come back, so there any
 * option other than the item's own value counts; locally it is the seeded one.
 */
const expectedSuggestion = (isCloud: boolean): RegExp =>
  isCloud ? /^(?!cmd\.exe$).+$/ : /^notepad\.exe$/;

const withValue = (value: string) => entries.map((entry) => ({ ...entry, value }));

/**
 * Creates an item with `value`, assigned to the worker's Elastic Defend policy,
 * and opens its edit flyout as a WRITE user. The policy matters: the Event
 * Filters value suggestions only read the endpoint data streams of namespaces
 * that have an Elastic Defend integration in the current space.
 */
const openEditForNewItem = async (
  {
    browserAuth,
    pageObjects,
    endpointArtifactItems,
    endpointPolicy,
  }: Pick<ArtifactTabTestFixtures, 'browserAuth' | 'pageObjects' | 'endpointArtifactItems'> &
    Pick<ArtifactTabWorkerFixtures, 'endpointPolicy'>,
  value: string
): Promise<string> => {
  const name = await endpointArtifactItems.create({
    listId,
    name: 'Event filter value edit',
    entries: withValue(value),
    osTypes,
    policyId: endpointPolicy.id,
  });
  await browserAuth.loginAsEndpointPolicyManager();
  await pageObjects.artifactListPage.goto(eventFilters.urlPath);
  await pageObjects.artifactListPage.waitForList(pagePrefix);
  await pageObjects.artifactListPage.openEditByName(pagePrefix, name);
  return name;
};

// Regression tests for #192196: the condition value can be edited by typing
// into it, and value suggestions come back after it is cleared.
spaceTest.describe(
  'Event Filters — edit the condition value',
  { tag: ARTIFACT_LIST_PAGE_TAGS },
  () => {
    spaceTest.beforeEach(async ({ apiServices }) => {
      // The shared-list suites above delete the list after each of their tests.
      await apiServices.endpointArtifacts.ensureList({
        listId,
        type: listType,
        name: ENDPOINT_ARTIFACT_LISTS.eventFilters.name,
        description: ENDPOINT_ARTIFACT_LISTS.eventFilters.description,
      });
    });

    spaceTest(
      'updates the value after typing a space, Backspace and a suffix',
      async ({ browserAuth, pageObjects, endpointArtifactItems, endpointPolicy }) => {
        const { artifactListPage, policyArtifactsPage } = pageObjects;
        const name = await openEditForNewItem(
          { browserAuth, pageObjects, endpointArtifactItems, endpointPolicy },
          SEEDED_VALUE
        );
        // The form loads the field list before it shows the item's value.
        await expect(policyArtifactsPage.eventFiltersValueInput).toHaveValue(SEEDED_VALUE);

        await policyArtifactsPage.typeInEventFiltersValue(' ');
        await policyArtifactsPage.pressInEventFiltersValue('Backspace');
        await policyArtifactsPage.typeInEventFiltersValue('.lnk');
        await expect(policyArtifactsPage.eventFiltersValueInput).toHaveValue(EDITED_VALUE);
        await policyArtifactsPage.pressInEventFiltersValue('Enter');
        await artifactListPage.submitFlyout(pagePrefix);

        await expect(artifactListPage.flyout(pagePrefix)).toBeHidden();
        await expect(artifactListPage.cardCriteriaByName(pagePrefix, name)).toHaveText(
          `AND process.nameIS ${EDITED_VALUE}`
        );
      }
    );

    spaceTest(
      'updates the value by typing a suffix without Backspace',
      async ({ browserAuth, pageObjects, endpointArtifactItems, endpointPolicy }) => {
        const { artifactListPage, policyArtifactsPage } = pageObjects;
        const name = await openEditForNewItem(
          { browserAuth, pageObjects, endpointArtifactItems, endpointPolicy },
          SEEDED_VALUE
        );
        await expect(policyArtifactsPage.eventFiltersValueInput).toHaveValue(SEEDED_VALUE);

        await policyArtifactsPage.typeInEventFiltersValue('.lnk');
        await expect(policyArtifactsPage.eventFiltersValueInput).toHaveValue(EDITED_VALUE);
        await policyArtifactsPage.pressInEventFiltersValue('Enter');
        await artifactListPage.submitFlyout(pagePrefix);

        await expect(artifactListPage.flyout(pagePrefix)).toBeHidden();
        await expect(artifactListPage.cardCriteriaByName(pagePrefix, name)).toHaveText(
          `AND process.nameIS ${EDITED_VALUE}`
        );
      }
    );

    spaceTest(
      'shows value suggestions again after the value is cleared',
      async ({ browserAuth, pageObjects, endpointArtifactItems, endpointPolicy, config }) => {
        const { policyArtifactsPage } = pageObjects;
        await openEditForNewItem(
          { browserAuth, pageObjects, endpointArtifactItems, endpointPolicy },
          NOT_SEEDED_VALUE
        );
        await expect(policyArtifactsPage.eventFiltersValueInput).toHaveValue(NOT_SEEDED_VALUE);

        await spaceTest.step('a value with no match shows no suggestions', async () => {
          await policyArtifactsPage.clearEventFiltersValue();
          await expect(policyArtifactsPage.eventFiltersValueInput).toHaveValue('');
          // Suggestions on screen first, so the list can only become empty once
          // the response for the typed value is rendered.
          await expect(
            policyArtifactsPage
              .eventFiltersValueOptions()
              .filter({ hasText: expectedSuggestion(config.isCloud) })
          ).not.toHaveCount(0);
          await policyArtifactsPage.typeInEventFiltersValue(NO_MATCH_VALUE);

          await expect(
            policyArtifactsPage.eventFiltersValueNoMatchHint(NO_MATCH_VALUE)
          ).toBeVisible();
          await expect(policyArtifactsPage.eventFiltersValueOptions()).toHaveCount(0);
        });

        await spaceTest.step('clearing the value shows suggestions again', async () => {
          await policyArtifactsPage.clearEventFiltersValue();
          await expect(policyArtifactsPage.eventFiltersValueInput).toHaveValue('');

          await expect(
            policyArtifactsPage
              .eventFiltersValueOptions()
              .filter({ hasText: expectedSuggestion(config.isCloud) })
          ).not.toHaveCount(0);
        });
      }
    );
  }
);
