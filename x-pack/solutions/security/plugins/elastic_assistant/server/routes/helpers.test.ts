/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';

import { DEFAULT_PLUGIN_NAME, getPluginNameFromRequest } from './helpers';
import { ExecuteConnectorRequestBody } from '@kbn/elastic-assistant-common';

describe('getPluginNameFromRequest', () => {
  const contextRequestHeaderEncoded = encodeURIComponent(
    JSON.stringify({
      type: 'application',
      name: 'superSolution',
      url: '/kbn/app/super/rules/id/163fa5a4-d72a-45fa-8142-8edc298ecd17/alerts',
      page: 'app',
      id: 'new',
    })
  );

  const request = {
    headers: {
      'x-kbn-context': contextRequestHeaderEncoded,
    },
  } as unknown as KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('extracts plugin name from "x-kbn-context" request header', async () => {
    const pluginName = getPluginNameFromRequest({
      request,
      defaultPluginName: DEFAULT_PLUGIN_NAME,
    });
    expect(pluginName).toEqual('superSolution');
  });

  it('fails to extract plugin name from undefined "x-kbn-context" request header, falls back to default provided', async () => {
    const invalidRequest = {
      headers: {
        'x-kbn-context': undefined,
      },
    } as unknown as KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;
    const pluginName = getPluginNameFromRequest({
      request: invalidRequest,
      defaultPluginName: DEFAULT_PLUGIN_NAME,
    });
    expect(pluginName).toEqual(DEFAULT_PLUGIN_NAME);
  });

  it('fails to extract plugin name from malformed "x-kbn-context" invalidRequest header, falls back to default provided', async () => {
    const invalidRequest = {
      headers: {
        'x-kbn-context': 'asdfku',
      },
    } as unknown as KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;
    const pluginName = getPluginNameFromRequest({
      request: invalidRequest,
      defaultPluginName: DEFAULT_PLUGIN_NAME,
    });
    expect(pluginName).toEqual(DEFAULT_PLUGIN_NAME);
  });
});
