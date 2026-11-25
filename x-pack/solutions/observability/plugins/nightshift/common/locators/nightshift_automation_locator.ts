/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NIGHTSHIFT_APP_ID, NIGHTSHIFT_AUTOMATION_LOCATOR_ID } from '@kbn/deeplinks-observability';
import type { NightshiftAutomationLocatorParams } from '@kbn/nightshift-shared';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/common';

export type NightshiftAutomationLocator = LocatorPublic<NightshiftAutomationLocatorParams>;

/** An automation's details page in the Nightshift app. */
export class NightshiftAutomationLocatorDefinition
  implements LocatorDefinition<NightshiftAutomationLocatorParams>
{
  public readonly id = NIGHTSHIFT_AUTOMATION_LOCATOR_ID;

  public readonly getLocation = async ({ automationId }: NightshiftAutomationLocatorParams) => ({
    app: NIGHTSHIFT_APP_ID,
    path: `/automations/${encodeURIComponent(automationId)}`,
    state: {},
  });
}
