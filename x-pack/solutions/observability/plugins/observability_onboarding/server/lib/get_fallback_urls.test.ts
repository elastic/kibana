/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { ElasticsearchConfig } from '@kbn/core/server';
import { EsLegacyConfigService } from '../services/es_legacy_config_service';
import { getFallbackESUrl } from './get_fallback_urls';

const getFallbackESUrlFor = (hosts: string[]): Promise<string[]> => {
  const esLegacyConfigService = new EsLegacyConfigService();
  esLegacyConfigService.setup(of({ hosts } as ElasticsearchConfig));
  return getFallbackESUrl(esLegacyConfigService);
};

describe('getFallbackESUrl', () => {
  it('returns hosts without credentials exactly as configured', async () => {
    const hosts = ['http://localhost:9200', 'https://es.example.com:9243/prefix'];

    expect(await getFallbackESUrlFor(hosts)).toEqual(hosts);
  });

  it('removes the username and password from a host', async () => {
    expect(await getFallbackESUrlFor(['http://kibana_system:secret@es:9200'])).toEqual([
      'http://es:9200',
    ]);
  });

  it('removes a username that has no password', async () => {
    expect(await getFallbackESUrlFor(['https://kibana_system@es:9200'])).toEqual([
      'https://es:9200',
    ]);
  });

  it('removes percent-encoded credentials', async () => {
    expect(await getFallbackESUrlFor(['https://user%40org:p%40ss%3Aword@es:9200'])).toEqual([
      'https://es:9200',
    ]);
  });

  it('keeps the path prefix of a host with credentials', async () => {
    expect(await getFallbackESUrlFor(['https://user:secret@proxy.example.com/es'])).toEqual([
      'https://proxy.example.com/es',
    ]);
  });

  it('keeps a trailing slash only when the configured host has one', async () => {
    expect(
      await getFallbackESUrlFor(['http://user:secret@es:9200/', 'http://user:secret@es:9201'])
    ).toEqual(['http://es:9200/', 'http://es:9201']);
  });

  it('removes credentials from every configured host', async () => {
    expect(
      await getFallbackESUrlFor([
        'http://user:secret@es-1:9200',
        'http://es-2:9200',
        'http://user:secret@es-3:9200',
      ])
    ).toEqual(['http://es-1:9200', 'http://es-2:9200', 'http://es-3:9200']);
  });

  it('drops a host that cannot be parsed instead of returning it unchanged', async () => {
    expect(await getFallbackESUrlFor(['http://user:secret@[::1', 'http://es:9200'])).toEqual([
      'http://es:9200',
    ]);
  });
});
