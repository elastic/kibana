/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findInventoryFields } from '.';

describe('findInventoryFields', () => {
  it('returns ECS pod identity when schema is omitted', () => {
    expect(findInventoryFields('pod')).toEqual({
      id: 'kubernetes.pod.uid',
      name: 'kubernetes.pod.name',
      ip: 'kubernetes.pod.ip',
    });
  });

  it('returns ECS pod identity for ecs', () => {
    expect(findInventoryFields('pod', 'ecs')).toEqual({
      id: 'kubernetes.pod.uid',
      name: 'kubernetes.pod.name',
      ip: 'kubernetes.pod.ip',
    });
  });

  it('returns SemConv pod identity for semconv', () => {
    expect(findInventoryFields('pod', 'semconv')).toEqual({
      id: 'k8s.pod.uid',
      name: 'k8s.pod.name',
    });
  });

  it('keeps host fields when semconv has no schemaFields override', () => {
    expect(findInventoryFields('host', 'semconv')).toEqual({
      id: 'host.name',
      name: 'host.name',
      os: 'host.os.name',
      ip: 'host.ip',
      cloudProvider: 'cloud.provider',
    });
  });

  it('returns model fields for non-legacy types regardless of schema', () => {
    expect(findInventoryFields('awsEC2', 'semconv')).toEqual({
      id: 'cloud.instance.id',
      name: 'cloud.instance.name',
      ip: 'aws.ec2.instance.public.ip',
    });
  });
});
