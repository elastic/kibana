/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  NIGHTSHIFT_APP_ID,
  NIGHTSHIFT_SIGNIFICANT_EVENT_LOCATOR_ID,
} from '@kbn/deeplinks-observability';
import {
  NIGHTSHIFT_EVENT_ID_QUERY_PARAM,
  type NightshiftSignificantEventLocatorParams,
} from '@kbn/nightshift-shared';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/common';

export type SignificantEventLocator = LocatorPublic<NightshiftSignificantEventLocatorParams>;

/** Opens the Nightshift events page with the flyout of one significant event, by its event id. */
export class SignificantEventLocatorDefinition
  implements LocatorDefinition<NightshiftSignificantEventLocatorParams>
{
  public readonly id = NIGHTSHIFT_SIGNIFICANT_EVENT_LOCATOR_ID;

  public readonly getLocation = async ({ eventId }: NightshiftSignificantEventLocatorParams) => ({
    app: NIGHTSHIFT_APP_ID,
    path: `/detections/events?${new URLSearchParams({
      [NIGHTSHIFT_EVENT_ID_QUERY_PARAM]: eventId,
    }).toString()}`,
    state: {},
  });
}
