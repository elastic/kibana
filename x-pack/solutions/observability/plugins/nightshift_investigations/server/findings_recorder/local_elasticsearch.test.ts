/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeLocalElasticsearch, withLocalElasticsearch } from './local_elasticsearch';

const local = describeLocalElasticsearch({
  cloud: {
    isServerlessEnabled: true,
    isCloudEnabled: true,
    serverless: { projectName: 'my-project', projectType: 'observability' },
  },
  url: 'https://user:pw@my-project.es.example.com:443/',
});

const event = (data_source: object) => ({ data_source } as never);

describe('describeLocalElasticsearch', () => {
  it('names a serverless project and drops credentials from the URL', () => {
    expect(local).toEqual({
      description: 'Elastic Cloud Serverless observability project my-project',
      url: 'https://my-project.es.example.com',
    });
  });

  it('describes a self-managed cluster', () => {
    expect(describeLocalElasticsearch({ url: 'http://localhost:9200' })).toEqual({
      description: 'Self-managed cluster',
      url: 'http://localhost:9200',
    });
  });
});

describe('withLocalElasticsearch', () => {
  it('marks Elasticsearch data local and gives the call its full endpoint', () => {
    const [out] = withLocalElasticsearch(
      [event({ name: 'Elasticsearch', api_call: { method: 'POST', endpoint: '/_query' } })],
      local
    ) as Array<{ data_source: Record<string, unknown> }>;
    expect(out.data_source).toEqual(
      expect.objectContaining({
        scope: 'local',
        base_url: 'https://my-project.es.example.com',
        instance: 'Elastic Cloud Serverless observability project my-project',
        api_call: { method: 'POST', endpoint: 'https://my-project.es.example.com/_query' },
      })
    );
  });

  it('keeps a remote cluster as the model described it and uses its URL', () => {
    const [out] = withLocalElasticsearch(
      [
        event({
          name: 'Elasticsearch',
          scope: 'remote',
          instance: 'Cluster prod-east',
          base_url: 'https://prod-east.example.com:9243/',
          api_call: { endpoint: '/_search' },
        }),
      ],
      local
    ) as Array<{ data_source: Record<string, unknown> }>;
    expect(out.data_source).toEqual(
      expect.objectContaining({
        scope: 'remote',
        instance: 'Cluster prod-east',
        api_call: { endpoint: 'https://prod-east.example.com:9243/_search' },
      })
    );
  });

  it('leaves other systems alone', () => {
    const slack = event({ name: 'Slack' });
    expect(withLocalElasticsearch([slack], local)).toEqual([slack]);
  });
});
