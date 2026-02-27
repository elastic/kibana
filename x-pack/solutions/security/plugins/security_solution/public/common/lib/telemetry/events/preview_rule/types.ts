/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';

import type { RootSchema } from '@kbn/core/public';

interface PreviewRuleParams {
  ruleType: Type;
  loggedRequestsEnabled: boolean;
}

export enum PreviewRuleEventTypes {
  PreviewRule = 'Preview rule',
}

export interface PreviewRuleTelemetryEventsMap {
  [PreviewRuleEventTypes.PreviewRule]: PreviewRuleParams;
}

export interface PreviewRuleTelemetryEvent {
  eventType: PreviewRuleEventTypes;
  schema: RootSchema<PreviewRuleTelemetryEventsMap[PreviewRuleEventTypes]>;
}
