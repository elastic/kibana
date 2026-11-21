/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthzDisabled } from '@kbn/core-security-server';
import { filterValuesRoute } from './route';

const ENDPOINT = 'POST /internal/entity_inventory/filters/_values';
const WINDOW = { from: '2026-11-01T09:00:00.000Z', to: '2026-11-01T11:00:00.000Z' };
const VALID = { attribute: 'k8s.cluster.name', types: ['k8s.deployment'], ...WINDOW };

const route = filterValuesRoute[ENDPOINT];

const parseRequest = (body: Record<string, unknown>) => route.params?.safeParse({ body });

describe(ENDPOINT, () => {
  it('is an internal route at the _values path', () => {
    expect(route).toMatchObject({ endpoint: ENDPOINT, options: { access: 'internal' } });
  });

  it('delegates authorization to the scoped Elasticsearch client', () => {
    expect(route.security).toStrictEqual({ authz: AuthzDisabled.delegateToESClient });
  });

  it('defaults the filters, the selected values and the limit', () => {
    expect(parseRequest(VALID)).toMatchObject({
      success: true,
      data: { body: { ...VALID, filters: {}, selected: [], limit: 9999 } },
    });
  });

  it('accepts the filters and the selected values of the other dropdowns', () => {
    const body = {
      ...VALID,
      filters: { 'kubernetes.namespace': ['default', 'checkout'] },
      selected: ['prod-eu'],
    };

    expect(parseRequest(body)).toMatchObject({ success: true, data: { body } });
  });

  describe('attribute and types', () => {
    it.each([
      ['an empty attribute', { attribute: '' }],
      ['an over-long attribute', { attribute: 'a'.repeat(257) }],
      ['no attribute', { attribute: undefined }],
      ['no types', { types: [] }],
      ['more than 32 types', { types: Array.from({ length: 33 }, (_, index) => `type.t${index}`) }],
      ['an invalid type name', { types: ['K8s.Deployment'] }],
    ])('rejects %s', (_label, overrides) => {
      expect(parseRequest({ ...VALID, ...overrides })?.success).toBe(false);
    });

    it('accepts 32 types', () => {
      const types = Array.from({ length: 32 }, (_, index) => `type.t${index}`);

      expect(parseRequest({ ...VALID, types })?.success).toBe(true);
    });
  });

  describe('filters and selected values', () => {
    const values = (count: number) => Array.from({ length: count }, (_, index) => `v${index}`);

    it('accepts 16 filters and rejects 17', () => {
      const filters = (count: number) =>
        Object.fromEntries(Array.from({ length: count }, (_, index) => [`f${index}`, ['a']]));

      expect(parseRequest({ ...VALID, filters: filters(16) })?.success).toBe(true);
      expect(parseRequest({ ...VALID, filters: filters(17) })?.success).toBe(false);
    });

    it('accepts 100 values per filter and rejects 101', () => {
      expect(parseRequest({ ...VALID, filters: { f: values(100) } })?.success).toBe(true);
      expect(parseRequest({ ...VALID, filters: { f: values(101) } })?.success).toBe(false);
    });

    it('accepts 100 selected values and rejects 101', () => {
      expect(parseRequest({ ...VALID, selected: values(100) })?.success).toBe(true);
      expect(parseRequest({ ...VALID, selected: values(101) })?.success).toBe(false);
    });

    it('rejects an empty or over-long value', () => {
      expect(parseRequest({ ...VALID, selected: [''] })?.success).toBe(false);
      expect(parseRequest({ ...VALID, selected: ['a'.repeat(257)] })?.success).toBe(false);
    });
  });

  describe('limit and window', () => {
    it.each([1, 9999])('accepts limit %i', (limit) => {
      expect(parseRequest({ ...VALID, limit })?.success).toBe(true);
    });

    it.each([0, 10000])('rejects limit %i', (limit) => {
      expect(parseRequest({ ...VALID, limit })?.success).toBe(false);
    });

    it('rejects from equal to or after to', () => {
      expect(parseRequest({ ...VALID, from: WINDOW.from, to: WINDOW.from })?.success).toBe(false);
      expect(parseRequest({ ...VALID, from: WINDOW.to, to: WINDOW.from })?.success).toBe(false);
    });
  });

  it('rejects an unknown body key such as documentFilter', () => {
    expect(parseRequest({ ...VALID, documentFilter: { bool: {} } })?.success).toBe(false);
  });
});
