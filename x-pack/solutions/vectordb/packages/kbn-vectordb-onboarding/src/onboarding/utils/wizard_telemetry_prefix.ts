/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VectorPath, WizardStep } from '../types';

/**
 * Path values contain hyphens, which collide with the `-` separator used
 * between telemetry ID segments. Map them to the camelCase keys already used
 * by the path-selection IDs (`pathSelection-generateVectors`, etc.).
 */
const PATH_TELEMETRY_KEY: Record<VectorPath, string> = {
  'generate-vectors': 'generateVectors',
  'have-vectors': 'haveVectors',
};

/** Builds the shared `data-telemetry-id` prefix for a wizard step, e.g. `vectordbOnboarding-generateVectors-ingest`. */
export const getWizardTelemetryPrefix = (path: VectorPath, step: WizardStep): string =>
  `vectordbOnboarding-${PATH_TELEMETRY_KEY[path]}-${step}`;
