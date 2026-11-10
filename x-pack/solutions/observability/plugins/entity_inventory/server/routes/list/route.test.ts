/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthzDisabled } from '@kbn/core-security-server';
import { listRoute } from './route';

const ENDPOINT = 'POST /internal/entity_inventory/entities/{type}/_list';
const WINDOW = { from: '2026-11-01T09:00:00.000Z', to: '2026-11-01T11:00:00.000Z' };

const route = listRoute[ENDPOINT];

const parseRequest = (body: Record<string, unknown>) =>
  route.params?.safeParse({ path: { type: 'k8s.deployment' }, body });

describe(ENDPOINT, () => {
  it('is an internal route at the _list path', () => {
    expect(route).toMatchObject({ endpoint: ENDPOINT, options: { access: 'internal' } });
  });

  it('delegates authorization to the scoped Elasticsearch client', () => {
    expect(route.security).toStrictEqual({ authz: AuthzDisabled.delegateToESClient });
  });

  it('defaults limit to 9,999', () => {
    expect(parseRequest(WINDOW)).toMatchObject({
      success: true,
      data: { body: { ...WINDOW, limit: 9999 } },
    });
  });

  it.each([1, 9999])('accepts limit %i', (limit) => {
    expect(parseRequest({ ...WINDOW, limit })?.success).toBe(true);
  });

  it.each([0, 10000])('rejects limit %i', (limit) => {
    expect(parseRequest({ ...WINDOW, limit })?.success).toBe(false);
  });

  it('rejects from equal to or after to', () => {
    expect(parseRequest({ from: WINDOW.from, to: WINDOW.from })?.success).toBe(false);
    expect(parseRequest({ from: WINDOW.to, to: WINDOW.from })?.success).toBe(false);
  });

  it('rejects an unknown body key such as documentFilter', () => {
    expect(parseRequest({ ...WINDOW, documentFilter: 'host.name == "a"' })?.success).toBe(false);
  });
});
