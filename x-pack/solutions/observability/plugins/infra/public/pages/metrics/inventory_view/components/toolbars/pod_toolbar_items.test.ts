/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { podGroupByFieldsForSchema } from './pod_toolbar_items';

const ECS_POD_GROUP_BY_FIELDS = ['kubernetes.namespace', 'kubernetes.node.name', 'service.type'];

const SEMCONV_POD_GROUP_BY_FIELDS = ['k8s.namespace.name', 'k8s.node.name', 'k8s.deployment.name'];

describe('podGroupByFieldsForSchema', () => {
  it('keeps ECS fields while the selector flag is off, even with OpenTelemetry preferred', () => {
    expect(podGroupByFieldsForSchema('semconv', false)).toEqual(ECS_POD_GROUP_BY_FIELDS);
  });

  it('uses SemConv fields when the flag is on and preferredSchema is OpenTelemetry', () => {
    expect(podGroupByFieldsForSchema('semconv', true)).toEqual(SEMCONV_POD_GROUP_BY_FIELDS);
  });

  it('uses SemConv fields when preferredSchema is still null (DEFAULT_SCHEMA is semconv)', () => {
    expect(podGroupByFieldsForSchema(null, true)).toEqual(SEMCONV_POD_GROUP_BY_FIELDS);
  });

  it('uses ECS fields when the flag is on and Elastic System Integration is selected', () => {
    expect(podGroupByFieldsForSchema('ecs', true)).toEqual(ECS_POD_GROUP_BY_FIELDS);
  });
});
