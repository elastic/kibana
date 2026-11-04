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
import type { NightshiftSignificantEventLocatorParams } from '@kbn/nightshift-shared';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/common';

/** Query param that opens a significant event's flyout on the Detections events page. */
export const NIGHTSHIFT_EVENT_ID_QUERY_PARAM = 'eventId';

export type SignificantEventLocatorParams = NightshiftSignificantEventLocatorParams;

export type SignificantEventLocator = LocatorPublic<SignificantEventLocatorParams>;

/** Opens a significant event in Nightshift, even when it is not on the first page of the list. */
export class SignificantEventLocatorDefinition
  implements LocatorDefinition<SignificantEventLocatorParams>
{
  public readonly id = NIGHTSHIFT_SIGNIFICANT_EVENT_LOCATOR_ID;

  public readonly getLocation = async ({ eventId }: SignificantEventLocatorParams) => {
    const searchParams = new URLSearchParams({ [NIGHTSHIFT_EVENT_ID_QUERY_PARAM]: eventId });
    return {
      app: NIGHTSHIFT_APP_ID,
      path: `/detections/events?${searchParams}`,
      state: {},
    };
  };
}
