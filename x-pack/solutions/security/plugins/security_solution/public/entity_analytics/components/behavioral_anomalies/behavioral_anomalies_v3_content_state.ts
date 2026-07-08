/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Prototype-only v.3 content state shared by the right-panel section and the
 * BA-v.3 left tab. Cleanup: delete with both State selectors.
 */

export type BehavioralAnomaliesV3ContentState = 'full' | 'empty' | 'loading' | 'error';

export const DEFAULT_BEHAVIORAL_ANOMALIES_V3_CONTENT_STATE: BehavioralAnomaliesV3ContentState =
  'full';

export const BEHAVIORAL_ANOMALIES_V3_CONTENT_STATE_OPTIONS: Array<{
  id: BehavioralAnomaliesV3ContentState;
  label: string;
}> = [
  { id: 'full', label: 'full' },
  { id: 'empty', label: 'empty' },
  { id: 'loading', label: 'loading' },
  { id: 'error', label: 'error' },
];
