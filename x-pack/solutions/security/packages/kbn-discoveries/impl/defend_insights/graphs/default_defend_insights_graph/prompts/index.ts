/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface DefendInsightsPrompts {
  default: string;
  refine: string;
  continue: string;
}

export interface DefendInsightsGenerationPrompts {
  group: string;
  events: string;
  eventsId: string;
  eventsEndpointId: string;
  eventsValue: string;
  remediation?: string;
  remediationMessage?: string;
  remediationLink?: string;
}

export type DefendInsightsCombinedPrompts = DefendInsightsPrompts & DefendInsightsGenerationPrompts;
