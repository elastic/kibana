/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AttackDiscoveryPrompts {
  default: string;
  refine: string;
  continue: string;
}

export interface GenerationPrompts {
  detailsMarkdown: string;
  entitySummaryMarkdown: string;
  mitreAttackTactics: string;
  summaryMarkdown: string;
  title: string;
  insights: string;
}

export interface CombinedPrompts extends AttackDiscoveryPrompts, GenerationPrompts {}
