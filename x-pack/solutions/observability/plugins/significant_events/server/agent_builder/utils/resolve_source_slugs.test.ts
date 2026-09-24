/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { SourcesClient } from '@kbn/nightshift-sources-plugin/server';
import {
  assertSourceEnabled,
  loadSourceCatalog,
  presentSlug,
  resolveSourcesBySlug,
  SourceDisabledError,
  UnknownSourceSlugError,
} from './resolve_source_slugs';

const checkout: NightshiftSource = {
  id: 'source-checkout',
  title: 'Checkout',
  tags: [],
  esql: 'FROM logs-checkout',
  slug: 'checkout',
  view_name: '$.nightshift.sources.default.checkout',
  enabled: true,
  created_by: 'user',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  esql_updated_at: '2026-01-01T00:00:00.000Z',
};

const payments: NightshiftSource = {
  ...checkout,
  id: 'source-payments',
  title: 'Payments',
  slug: 'payments',
  view_name: '$.nightshift.sources.default.payments',
  enabled: false,
};

const catalog = {
  bySlug: new Map([
    [checkout.slug, checkout],
    [payments.slug, payments],
  ]),
  byId: new Map([
    [checkout.id, checkout],
    [payments.id, payments],
  ]),
};

describe('loadSourceCatalog', () => {
  it('indexes enabled and disabled sources by slug and id', async () => {
    const sourcesClient = {
      list: jest.fn().mockResolvedValue({ sources: [checkout, payments], total: 2 }),
    } as unknown as SourcesClient;

    const loaded = await loadSourceCatalog(sourcesClient);

    expect(sourcesClient.list).toHaveBeenCalledWith({
      page: 1,
      perPage: 10_000,
      enabled: undefined,
    });
    expect(loaded.bySlug.get('checkout')).toBe(checkout);
    expect(loaded.byId.get('source-payments')).toBe(payments);
  });
});

describe('resolveSourcesBySlug', () => {
  it('returns sources in the caller order, repeating a slug that appears twice', () => {
    expect(resolveSourcesBySlug(catalog, ['payments', 'checkout', 'payments'])).toEqual([
      payments,
      checkout,
      payments,
    ]);
  });

  it('throws UnknownSourceSlugError naming every missing slug', () => {
    expect(() => resolveSourcesBySlug(catalog, ['checkout', 'missing', 'also-missing'])).toThrow(
      new UnknownSourceSlugError(['missing', 'also-missing'])
    );
  });
});

describe('presentSlug', () => {
  it('returns the slug for a stored source id', () => {
    expect(presentSlug(catalog, 'source-checkout')).toBe('checkout');
  });

  it('returns an unknown stored id unchanged', () => {
    expect(presentSlug(catalog, 'logs.otel')).toBe('logs.otel');
  });
});

describe('assertSourceEnabled', () => {
  it('allows an enabled source', () => {
    expect(() => assertSourceEnabled(checkout)).not.toThrow();
  });

  it('throws SourceDisabledError for a disabled source', () => {
    expect(() => assertSourceEnabled(payments)).toThrow(new SourceDisabledError('payments'));
  });
});
