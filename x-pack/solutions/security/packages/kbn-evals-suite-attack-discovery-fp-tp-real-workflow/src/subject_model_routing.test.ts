/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { routeSubjectModel } from './subject_model_routing';

describe('routeSubjectModel', () => {
  const previous = [{ feature_id: 'other_feature', endpoints: [{ id: 'other-endpoint' }] }];
  let fetch: jest.Mock;

  beforeEach(() => {
    fetch = jest.fn(async (_path: string, { method }: { method: string }) =>
      method === 'GET' ? { data: { features: previous } } : undefined
    );
  });

  const putBodies = () =>
    fetch.mock.calls
      .filter(([, options]) => options.method === 'PUT')
      .map(([, options]) => JSON.parse(options.body));

  const routedEndpoint = (body: {
    features: Array<{ feature_id: string; endpoints: Array<{ id: string }> }>;
  }) => body.features.find((f) => f.feature_id === 'alertzero_reasoning')?.endpoints[0].id;

  it('routes the alertzero_reasoning feature to the project connector id', async () => {
    await routeSubjectModel({ fetch: fetch as unknown as HttpHandler, connector: { id: 'gpt-x' } });

    expect(putBodies()).toEqual([
      {
        features: [
          ...previous,
          { feature_id: 'alertzero_reasoning', endpoints: [{ id: 'gpt-x' }] },
        ],
      },
    ]);
  });

  it('routes each project to its own connector, never a shared one', async () => {
    await routeSubjectModel({ fetch: fetch as unknown as HttpHandler, connector: { id: 'a' } });
    await routeSubjectModel({ fetch: fetch as unknown as HttpHandler, connector: { id: 'b' } });

    expect(putBodies().map(routedEndpoint)).toEqual(['a', 'b']);
  });

  it('restores the previous inference settings', async () => {
    const restore = await routeSubjectModel({
      fetch: fetch as unknown as HttpHandler,
      connector: { id: 'gpt-x' },
    });
    await restore();

    expect(putBodies()[1]).toEqual({ features: previous });
  });
});
