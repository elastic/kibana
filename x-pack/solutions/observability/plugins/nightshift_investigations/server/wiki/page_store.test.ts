/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { canonicalizeSlug, createWikiPageStore, toWikiKiId } from './page_store';

const source = {
  '@timestamp': '2026-09-09T12:00:00.000Z',
  type: 'service',
  title: 'Checkout',
  description: 'Payments checkout',
  content: 'Checkout talks to Redis.',
  tags: ['wiki', 'service'],
  attributes: {
    status: 'established',
    corroborations: 3,
    slug: 'checkout',
  },
};

describe('canonicalizeSlug', () => {
  it('strips wiki and entity-type prefixes copied from document ids', () => {
    expect(canonicalizeSlug('service', 'email-service')).toBe('email-service');
    expect(canonicalizeSlug('service', 'wiki-service-email-service')).toBe('email-service');
    expect(canonicalizeSlug('service', 'wiki_service_email-service')).toBe('email-service');
    expect(canonicalizeSlug('runbook', 'wiki-runbook-checkout-high-p99-latency')).toBe(
      'checkout-high-p99-latency'
    );
    expect(canonicalizeSlug('service', 'service-mesh')).toBe('service-mesh');
  });

  it('keeps real slugs that merely start with wiki', () => {
    expect(canonicalizeSlug('service', 'wiki-api')).toBe('wiki-api');
    expect(canonicalizeSlug('service', 'wiki-search')).toBe('wiki-search');
    expect(canonicalizeSlug('runbook', 'wiki-service-outage')).toBe('wiki-service-outage');
  });
});

describe('toWikiKiId', () => {
  it('normalizes the slug into a stable document id', () => {
    expect(toWikiKiId('service', 'Checkout Service')).toBe('wiki_service_checkout-service');
    expect(toWikiKiId('service', 'wiki-service-email-service')).toBe('wiki_service_email-service');
  });
});

describe('createWikiPageStore', () => {
  const logger = loggerMock.create();

  it('lists wiki pages and computes stats from the unfiltered set', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        hits: {
          hits: [
            { _id: 'wiki_service_checkout', _source: source },
            {
              _id: 'wiki_alert_latency',
              _source: {
                ...source,
                type: 'alert',
                title: 'Latency',
                attributes: { status: 'tentative', corroborations: 1, slug: 'latency' },
              },
            },
          ],
        },
      }),
    };

    const store = createWikiPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'default',
    });

    const result = await store.list({ entityType: 'service' });

    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].title).toBe('Checkout');
    expect(result.stats).toEqual({
      total: 2,
      established: 1,
      total_corroborations: 4,
      last_updated: '2026-09-09T12:00:00.000Z',
    });
  });

  it('collapses slug-prefix duplicates onto the canonical page', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'wiki_service_wiki-service-email-service',
              _source: {
                ...source,
                title: 'Email Service',
                attributes: {
                  status: 'tentative',
                  corroborations: 0,
                  slug: 'wiki-service-email-service',
                },
              },
            },
            {
              _id: 'wiki_service_email-service',
              _source: {
                ...source,
                title: 'Email Service',
                attributes: { status: 'established', corroborations: 1, slug: 'email-service' },
              },
            },
          ],
        },
      }),
    };

    const store = createWikiPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'default',
    });

    const result = await store.list();

    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].id).toBe('wiki_service_email-service');
    expect(result.stats.total).toBe(1);
  });

  it('upserts a page with a stable id and returns the normalized document', async () => {
    const esClient = {
      get: jest.fn().mockRejectedValue({ statusCode: 404 }),
      index: jest.fn().mockResolvedValue({ _id: 'wiki_service_checkout' }),
    };

    const store = createWikiPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'default',
    });

    const page = await store.upsert({
      entityType: 'service',
      slug: 'checkout',
      title: 'Checkout',
      content: 'Checkout talks to Redis.',
      status: 'tentative',
    });

    // The space lives in the stored id so two spaces cannot overwrite each other's page, while
    // the id the caller sees stays logical.
    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'default:wiki_service_checkout',
        document: expect.objectContaining({
          type: 'service',
          title: 'Checkout',
          tags: ['wiki', 'service'],
          attributes: expect.objectContaining({ space_id: 'default' }),
        }),
      }),
      expect.anything()
    );
    expect(page.id).toBe('wiki_service_checkout');
    expect(page.corroborations).toBe(0);
  });

  it('writes and returns the same id for slugs with repeated copied prefixes', async () => {
    const esClient = {
      get: jest.fn().mockRejectedValue({ statusCode: 404 }),
      index: jest.fn().mockResolvedValue({}),
    };
    const store = createWikiPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'default',
    });

    const page = await store.upsert({
      entityType: 'service',
      slug: 'wiki-wiki-service-email-service',
      title: 'Email',
      content: '',
      status: 'tentative',
    });

    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({ id: `default:${page.id}` }),
      expect.anything()
    );
    expect(page.id).toBe(toWikiKiId('service', page.slug));
  });

  it('reads a page with its version and writes against it', async () => {
    const esClient = {
      get: jest.fn().mockResolvedValue({
        found: true,
        _id: 'default:wiki_service_checkout',
        _seq_no: 7,
        _primary_term: 1,
        _source: {
          type: 'service',
          title: 'Checkout',
          content: '',
          attributes: { status: 'tentative', corroborations: 2, slug: 'checkout' },
        },
      }),
      index: jest.fn().mockResolvedValue({ _seq_no: 8, _primary_term: 1 }),
    };
    const store = createWikiPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'default',
    });

    const loaded = await store.get('wiki_service_checkout');
    expect(loaded?.version).toBe('7:1');

    const written = await store.upsert({
      entityType: 'service',
      slug: 'checkout',
      title: 'Checkout (edited)',
      content: '',
      status: 'tentative',
      version: loaded?.version,
    });

    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({ if_seq_no: 7, if_primary_term: 1 }),
      expect.anything()
    );
    expect(written.version).toBe('8:1');
  });

  it('writes unconditionally without a version', async () => {
    const esClient = {
      get: jest.fn().mockRejectedValue({ statusCode: 404 }),
      index: jest.fn().mockResolvedValue({}),
    };
    const store = createWikiPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'default',
    });

    await store.upsert({
      entityType: 'service',
      slug: 'checkout',
      title: 'Checkout',
      content: '',
      status: 'tentative',
    });

    expect(esClient.index.mock.calls[0][0]).not.toHaveProperty('if_seq_no');
  });

  it('creates a page with a create-only write', async () => {
    const esClient = { create: jest.fn().mockResolvedValue({}) };
    const store = createWikiPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'default',
    });

    const page = await store.create({
      entityType: 'service',
      slug: 'Checkout',
      title: 'Checkout',
      content: 'Checkout talks to Redis.',
      status: 'tentative',
    });

    expect(esClient.create).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'default:wiki_service_checkout' }),
      expect.anything()
    );
    expect(page).toEqual(
      expect.objectContaining({ id: 'wiki_service_checkout', slug: 'checkout' })
    );
  });

  it('refuses to create a page that already exists', async () => {
    const esClient = { create: jest.fn().mockRejectedValue({ statusCode: 409 }) };
    const store = createWikiPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'default',
    });

    await expect(
      store.create({
        entityType: 'service',
        slug: 'checkout',
        title: 'Checkout',
        content: '',
        status: 'tentative',
      })
    ).resolves.toBeUndefined();
  });

  it('increments corroborations on an existing page', async () => {
    const esClient = {
      get: jest.fn().mockResolvedValue({
        found: true,
        _id: 'wiki_service_checkout',
        _source: source,
      }),
      index: jest.fn().mockResolvedValue({ _id: 'wiki_service_checkout' }),
    };

    const store = createWikiPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'default',
    });

    const page = await store.corroborate('wiki_service_checkout');

    expect(page?.corroborations).toBe(4);
    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        document: expect.objectContaining({
          attributes: expect.objectContaining({ corroborations: 4 }),
        }),
      }),
      expect.anything()
    );
  });

  it('keeps the authors when a later conversation corroborates, and reads them back', async () => {
    const authored = {
      ...source,
      attributes: { ...source.attributes, authored_by: ['conversation-1'] },
    };
    const esClient = {
      get: jest.fn().mockResolvedValue({
        found: true,
        _id: 'wiki_service_checkout',
        _source: authored,
      }),
      index: jest.fn().mockResolvedValue({ _id: 'wiki_service_checkout' }),
    };

    const store = createWikiPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'default',
    });

    const page = await store.corroborate('wiki_service_checkout', {
      conversationId: 'conversation-2',
    });

    expect(page?.conversation_id).toBe('conversation-2');
    expect(page?.authored_by).toEqual(['conversation-1']);
  });

  it('replaces the authors on an upsert that names them', async () => {
    const esClient = {
      get: jest.fn().mockResolvedValue({ found: false }),
      index: jest.fn().mockResolvedValue({ _id: 'wiki_service_checkout' }),
    };

    const store = createWikiPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'default',
    });

    await store.upsert({
      entityType: 'service',
      slug: 'checkout',
      title: 'Checkout',
      content: 'Checkout talks to Redis.',
      status: 'tentative',
      authoredBy: ['conversation-1', 'conversation-2'],
    });

    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        document: expect.objectContaining({
          attributes: expect.objectContaining({
            authored_by: ['conversation-1', 'conversation-2'],
          }),
        }),
      }),
      expect.anything()
    );
  });

  // Corroborating revives an archived page, but it has to earn its way back rather than jumping
  // straight to the status the optimizer retired it from.
  it('revives an archived page as tentative, not established', async () => {
    const esClient = {
      get: jest.fn().mockResolvedValue({
        found: true,
        _id: 'wiki_service_checkout',
        _source: {
          ...source,
          attributes: { ...source.attributes, status: 'archived' },
        },
      }),
      index: jest.fn().mockResolvedValue({ _id: 'wiki_service_checkout' }),
    };

    const store = createWikiPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'default',
    });

    const page = await store.corroborate('wiki_service_checkout');

    expect(page?.status).toBe('tentative');
  });

  it('promotes a tentative page to established once a later run corroborates it', async () => {
    const esClient = {
      get: jest.fn().mockResolvedValue({
        found: true,
        _id: 'wiki_service_checkout',
        _source: {
          ...source,
          attributes: { ...source.attributes, status: 'tentative', corroborations: 0 },
        },
      }),
      index: jest.fn().mockResolvedValue({ _id: 'wiki_service_checkout' }),
    };

    const store = createWikiPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'default',
    });

    const page = await store.corroborate('wiki_service_checkout');

    expect(page?.status).toBe('established');
    expect(page?.corroborations).toBe(1);
  });

  it('prunes prefixed duplicate ids onto the canonical document', async () => {
    const prefixed = {
      ...source,
      title: 'Email Service',
      '@timestamp': '2026-09-09T13:00:00.000Z',
      attributes: {
        status: 'tentative',
        corroborations: 2,
        slug: 'wiki-service-email-service',
      },
    };
    const canonical = {
      ...source,
      title: 'Email Service',
      attributes: { status: 'established', corroborations: 1, slug: 'email-service' },
    };
    const esClient = {
      search: jest.fn().mockResolvedValue({
        hits: {
          hits: [
            { _id: 'wiki_service_wiki-service-email-service', _source: prefixed },
            { _id: 'wiki_service_email-service', _source: canonical },
          ],
        },
      }),
      get: jest.fn().mockImplementation(async ({ id }: { id: string }) => {
        if (id === 'default:wiki_service_wiki-service-email-service') {
          return { found: true, _id: id, _source: prefixed };
        }
        if (id === 'default:wiki_service_email-service') {
          return { found: true, _id: id, _source: canonical };
        }
        return { found: false };
      }),
      index: jest.fn().mockResolvedValue({ _id: 'wiki_service_email-service' }),
      delete: jest.fn().mockResolvedValue({}),
    };

    const store = createWikiPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'default',
    });

    await expect(store.pruneDuplicates()).resolves.toBe(1);
    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'default:wiki_service_email-service',
        document: expect.objectContaining({
          attributes: expect.objectContaining({ corroborations: 2, slug: 'email-service' }),
        }),
      }),
      expect.anything()
    );
    expect(esClient.delete).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'default:wiki_service_wiki-service-email-service' }),
      expect.anything()
    );
  });

  it('only reads pages belonging to its own space', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
    };

    const store = createWikiPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'marketing',
    });

    await store.list();

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            filter: [{ term: { tags: 'wiki' } }, { term: { 'attributes.space_id': 'marketing' } }],
          },
        },
      }),
      expect.anything()
    );
  });

  it('keeps two spaces on separate documents for the same entity', async () => {
    const indexFor = async (spaceId: string) => {
      const esClient = {
        get: jest.fn().mockResolvedValue({ found: false }),
        index: jest.fn().mockResolvedValue({}),
      };
      const store = createWikiPageStore({
        esClient: esClient as never,
        logger,
        spaceId,
      });
      await store.upsert({
        entityType: 'service',
        slug: 'checkout',
        title: 'Checkout',
        content: 'same entity, different space',
        status: 'tentative',
      });
      return esClient.index.mock.calls[0][0].id;
    };

    expect(await indexFor('default')).toBe('default:wiki_service_checkout');
    expect(await indexFor('marketing')).toBe('marketing:wiki_service_checkout');
  });

  it('hands callers logical ids even though storage is namespaced', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        hits: { hits: [{ _id: 'marketing:wiki_service_checkout', _source: source }] },
      }),
    };

    const store = createWikiPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'marketing',
    });

    const { pages } = await store.list();

    expect(pages[0].id).toBe('wiki_service_checkout');
  });
});
