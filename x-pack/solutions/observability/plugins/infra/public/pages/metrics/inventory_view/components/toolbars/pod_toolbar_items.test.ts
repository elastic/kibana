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
  it('uses SemConv fields when preferredSchema is OpenTelemetry', () => {
    expect(podGroupByFieldsForSchema('semconv')).toEqual(SEMCONV_POD_GROUP_BY_FIELDS);
  });

  it('uses SemConv fields when preferredSchema is still null (DEFAULT_SCHEMA is semconv)', () => {
    expect(podGroupByFieldsForSchema(null)).toEqual(SEMCONV_POD_GROUP_BY_FIELDS);
  });

  it('uses ECS fields when Elastic System Integration is selected', () => {
    expect(podGroupByFieldsForSchema('ecs')).toEqual(ECS_POD_GROUP_BY_FIELDS);
  });
});
