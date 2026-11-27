/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { KibanaLocation, LocatorDefinition } from '@kbn/share-plugin/public';
import { ALERTING_V2_CLASSIC_RULES_LOCATOR } from '@kbn/alerting-v2-constants';
import {
  OBSERVABILITY_ALERTING_APP_ID,
  OBSERVABILITY_ALERTING_RULES_V1_PATH,
} from '@kbn/deeplinks-observability';

export type ClassicRulesLocatorParams = SerializableRecord;

/** Resolves to the Classic tab of the Observability Alerting rules page. */
export const classicRulesLocatorDefinition: LocatorDefinition<ClassicRulesLocatorParams> = {
  id: ALERTING_V2_CLASSIC_RULES_LOCATOR,
  getLocation: async (): Promise<KibanaLocation> => ({
    app: OBSERVABILITY_ALERTING_APP_ID,
    path: OBSERVABILITY_ALERTING_RULES_V1_PATH,
    state: {},
  }),
};
