/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { findRecommendedMember, orderMembers } from './recommended_variant';

const member = (
  name: string,
  overrides: Partial<IntegrationCardItem> = {}
): IntegrationCardItem => ({
  id: `epr:${name}`,
  name,
  title: name,
  description: 'Member.',
  categories: ['observability'],
  icons: [],
  url: `/app/integrations/detail/${name}`,
  version: '1.0.0',
  integration: '',
  type: 'integration',
  ...overrides,
});

const ecs = member('nginx');
const otelAssets = member('nginx_otel', {
  type: 'content',
  categories: ['observability', 'opentelemetry'],
});
const otelInput = member('nginx_otel_input', {
  type: 'input',
  categories: ['observability', 'opentelemetry'],
});
const ecsIngress = member('nginx_ingress_controller');

describe('findRecommendedMember', () => {
  it('picks the first OpenTelemetry member that installs something', () => {
    expect(findRecommendedMember([ecs, otelInput, otelAssets])).toBe(otelInput);
  });

  // Assets packs have the category but only ship dashboards.
  it('skips OpenTelemetry assets packages even when they come first', () => {
    expect(findRecommendedMember([otelAssets, ecs, otelInput])).toBe(otelInput);
  });

  it('finds nothing when no member is an installable OpenTelemetry package', () => {
    expect(findRecommendedMember([ecs, ecsIngress])).toBeUndefined();
    expect(findRecommendedMember([ecs, otelAssets])).toBeUndefined();
  });

  it('skips OpenTelemetry members whose type is missing or unknown', () => {
    const missingType = member('nginx_otel_unknown', {
      type: undefined,
      categories: ['observability', 'opentelemetry'],
    });
    const unknownType = member('nginx_otel_link', {
      type: 'ui_link',
      categories: ['observability', 'opentelemetry'],
    });

    expect(findRecommendedMember([missingType, ecs, otelInput])).toBe(otelInput);
    expect(findRecommendedMember([unknownType])).toBeUndefined();
  });
});

describe('orderMembers', () => {
  it('fronts the recommended member and keeps registry order for the rest', () => {
    expect(orderMembers([ecs, otelAssets, otelInput, ecsIngress])).toEqual([
      otelInput,
      ecs,
      otelAssets,
      ecsIngress,
    ]);
  });

  it('returns the members unchanged when there is nothing to recommend', () => {
    const members = [ecs, ecsIngress];

    const ordered = orderMembers(members);

    expect(ordered).toEqual(members);
    expect(ordered).not.toBe(members);
  });
});
