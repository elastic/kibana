/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { WIKI_AI_INDEX_DEST } from '../../common/wiki';
import { createWikiPageStore } from './page_store';

const page = (type: string) => ({
  found: true,
  _id: `default:wiki_${type}_checkout`,
  _source: { type, title: 'Checkout', content: '', attributes: { status: 'established' } },
});

describe('createWikiPageStore', () => {
  const logger = loggerMock.create();

  it('reads and writes the Nightshift wiki index unless told otherwise', async () => {
    const esClient = {
      get: jest.fn().mockResolvedValue({ found: false }),
      index: jest.fn().mockResolvedValue({}),
    };

    await createWikiPageStore({ esClient: esClient as never, logger, spaceId: 'default' }).upsert({
      entityType: 'service',
      slug: 'checkout',
      title: 'Checkout',
      content: '',
      status: 'tentative',
    });
    await createWikiPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'default',
      destValue: 'eval-wiki',
    }).get('wiki_service_checkout');

    expect(esClient.index.mock.calls[0][0].index).toBe(WIKI_AI_INDEX_DEST);
    expect(esClient.get.mock.calls[1][0].index).toBe('eval-wiki');
  });

  it('reads only Nightshift page types as pages', async () => {
    const esClient = {
      get: jest
        .fn()
        .mockResolvedValueOnce(page('service'))
        .mockResolvedValueOnce(page('detection_rule')),
    };
    const store = createWikiPageStore({ esClient: esClient as never, logger, spaceId: 'default' });

    await expect(store.get('wiki_service_checkout')).resolves.toMatchObject({
      entity_type: 'service',
    });
    await expect(store.get('wiki_detection_rule_checkout')).resolves.toBeUndefined();
  });
});
