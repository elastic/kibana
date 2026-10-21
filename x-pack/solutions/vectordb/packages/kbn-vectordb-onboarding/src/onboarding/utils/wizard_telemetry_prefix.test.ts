/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getWizardTelemetryPrefix } from './wizard_telemetry_prefix';

describe('getWizardTelemetryPrefix', () => {
  it('orders segments as path then step', () => {
    expect(getWizardTelemetryPrefix('generate-vectors', 'ingest')).toBe(
      'vectordbOnboarding-generateVectors-ingest'
    );
    expect(getWizardTelemetryPrefix('have-vectors', 'search')).toBe(
      'vectordbOnboarding-haveVectors-search'
    );
  });

  it('does not emit hyphens inside the path segment', () => {
    const prefix = getWizardTelemetryPrefix('generate-vectors', 'search');
    expect(prefix.split('-')).toEqual(['vectordbOnboarding', 'generateVectors', 'search']);
  });
});
