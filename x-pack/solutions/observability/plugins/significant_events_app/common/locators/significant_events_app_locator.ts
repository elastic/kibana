/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SIGNIFICANT_EVENTS_APP_ID,
  SIGNIFICANT_EVENTS_APP_LOCATOR_ID,
} from '@kbn/deeplinks-observability';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';

export type SignificantEventsAppTab =
  | 'streams'
  | 'knowledge_indicators'
  | 'queries'
  | 'detections'
  | 'significant_events'
  | 'cortex'
  | 'decision_trees';

/**
 * Builds locations for Significant Events management tabs.
 */
export interface SignificantEventsAppLocatorParams extends SerializableRecord {
  tab?: SignificantEventsAppTab;
  rangeFrom?: string;
  rangeTo?: string;
  search?: string;
  status?: string | string[];
  severity?: string | string[];
  type?: string | string[];
  subtype?: string | string[];
  stream?: string | string[];
  showComputed?: string;
  selectedItem?: string;
  selectedEvent?: string;
}

export type SignificantEventsAppLocator = LocatorPublic<SignificantEventsAppLocatorParams>;

/**
 * List filters whose empty selection is meaningful: the significant events tab encodes "nothing
 * selected" as `key=` (see `useSignificantEventsUrlState`), while an absent key means the default.
 */
const EXPLICIT_EMPTY_PARAMS = new Set<string>(['status', 'severity']);

export class SignificantEventsAppLocatorDefinition
  implements LocatorDefinition<SignificantEventsAppLocatorParams>
{
  public readonly id = SIGNIFICANT_EVENTS_APP_LOCATOR_ID;

  public readonly getLocation = async ({
    tab = 'streams',
    ...query
  }: SignificantEventsAppLocatorParams) => {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value == null) {
        continue;
      }
      if (Array.isArray(value) && value.length === 0) {
        if (EXPLICIT_EMPTY_PARAMS.has(key)) {
          searchParams.append(key, '');
        }
        continue;
      }
      // Repeated keys for array values, matching the io-ts codecs of the route.
      for (const entry of Array.isArray(value) ? value : [value]) {
        searchParams.append(key, String(entry));
      }
    }

    const search = searchParams.toString();

    return {
      app: SIGNIFICANT_EVENTS_APP_ID,
      path: `/${tab}${search ? `?${search}` : ''}`,
      state: {},
    };
  };
}
