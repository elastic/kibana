/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeKubernetesElasticsearchUrl } from './normalize_kubernetes_elasticsearch_url';

describe('normalizeKubernetesElasticsearchUrl', () => {
  it('uses host.docker.internal for loopback Elasticsearch URLs', () => {
    expect(normalizeKubernetesElasticsearchUrl('http://localhost:9200')).toBe(
      'http://host.docker.internal:9200'
    );
    expect(normalizeKubernetesElasticsearchUrl('https://127.0.0.1:9200')).toBe(
      'https://host.docker.internal:9200'
    );
    expect(normalizeKubernetesElasticsearchUrl('http://[::1]:9200')).toBe(
      'http://host.docker.internal:9200'
    );
  });

  it('leaves non-loopback Elasticsearch URLs unchanged', () => {
    expect(normalizeKubernetesElasticsearchUrl('https://example.elastic-cloud.com:9243')).toBe(
      'https://example.elastic-cloud.com:9243'
    );
    expect(normalizeKubernetesElasticsearchUrl('http://192.168.1.34:9200')).toBe(
      'http://192.168.1.34:9200'
    );
  });
});
