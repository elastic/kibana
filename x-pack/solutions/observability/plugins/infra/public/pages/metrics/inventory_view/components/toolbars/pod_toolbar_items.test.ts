/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ecsPodGroupByFields,
  podGroupByFieldsForSchema,
  semconvPodGroupByFields,
} from './pod_toolbar_items';

describe('podGroupByFieldsForSchema', () => {
  it('keeps ECS fields while the selector flag is off, even with OpenTelemetry preferred', () => {
    expect(podGroupByFieldsForSchema('semconv', false)).toEqual(ecsPodGroupByFields);
  });

  it('uses SemConv fields when the flag is on and preferredSchema is OpenTelemetry', () => {
    expect(podGroupByFieldsForSchema('semconv', true)).toEqual(semconvPodGroupByFields);
  });

  it('uses SemConv fields when preferredSchema is still null (DEFAULT_SCHEMA is semconv)', () => {
    expect(podGroupByFieldsForSchema(null, true)).toEqual(semconvPodGroupByFields);
  });

  it('uses ECS fields when the flag is on and Elastic System Integration is selected', () => {
    expect(podGroupByFieldsForSchema('ecs', true)).toEqual(ecsPodGroupByFields);
  });
});
