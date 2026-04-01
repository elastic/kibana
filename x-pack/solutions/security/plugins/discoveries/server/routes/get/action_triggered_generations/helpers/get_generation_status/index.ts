/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type GenerationStatus = 'failed' | 'running' | 'succeeded' | 'unknown';

const ACTION_TO_STATUS: Readonly<Record<string, GenerationStatus>> = {
  'generation-failed': 'failed',
  'generation-started': 'running',
  'generation-succeeded': 'succeeded',
};

export const getGenerationStatus = (action: string | undefined): GenerationStatus =>
  (action != null ? ACTION_TO_STATUS[action] : undefined) ?? 'unknown';
