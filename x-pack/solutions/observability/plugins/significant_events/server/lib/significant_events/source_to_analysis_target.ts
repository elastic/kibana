/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalysisTarget } from '@kbn/nightshift-ai';
import type { NightshiftSource } from '@kbn/nightshift-shared';

/** Maps a Nightshift source onto the analysis contract. Sampling and generated queries read the view. */
export const sourceToAnalysisTarget = (source: NightshiftSource): AnalysisTarget => ({
  id: source.id,
  name: source.title,
  description: source.description,
  sources: [source.view_name],
  samplingSource: source.view_name,
});
