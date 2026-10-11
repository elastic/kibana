/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NIGHTSHIFT_APP_ID } from '@kbn/deeplinks-observability';
import type { Severity } from '@kbn/significant-events-schema';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';

export const NIGHTSHIFT_SEARCH_QUERY_PARAM = 'q';
export const NIGHTSHIFT_SEVERITY_QUERY_PARAM = 'severity';
export const NIGHTSHIFT_INVESTIGATION_ID_QUERY_PARAM = 'investigationId';

export const NIGHTSHIFT_INVESTIGATION_LOCATOR_ID = 'NIGHTSHIFT_INVESTIGATION_LOCATOR';

export interface InvestigationLocatorParams extends SerializableRecord {
  investigationId?: string;
  q?: string;
  severity?: Severity;
}

export type InvestigationLocator = LocatorPublic<InvestigationLocatorParams>;

export class InvestigationLocatorDefinition
  implements LocatorDefinition<InvestigationLocatorParams>
{
  public readonly id = NIGHTSHIFT_INVESTIGATION_LOCATOR_ID;

  public readonly getLocation = async (params?: InvestigationLocatorParams) => {
    const searchParams = new URLSearchParams();
    if (params?.investigationId) {
      searchParams.set(NIGHTSHIFT_INVESTIGATION_ID_QUERY_PARAM, params.investigationId);
    }
    if (params?.q) {
      searchParams.set(NIGHTSHIFT_SEARCH_QUERY_PARAM, params.q);
    }
    if (params?.severity) {
      searchParams.set(NIGHTSHIFT_SEVERITY_QUERY_PARAM, params.severity);
    }
    const queryString = searchParams.toString();

    return {
      app: NIGHTSHIFT_APP_ID,
      path: queryString ? `?${queryString}` : '',
      state: {},
    };
  };
}
