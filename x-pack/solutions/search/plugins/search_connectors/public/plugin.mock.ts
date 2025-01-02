/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IStaticAssets } from '@kbn/core-http-browser';
import { getConnectorFullTypes } from '../common/lib/connector_types';
import type { SearchConnectorsPluginStart } from './types';

const createStartMock = (): jest.Mocked<SearchConnectorsPluginStart> => ({
  getConnectorTypes: jest.fn(() =>
    getConnectorFullTypes({
      getPluginAssetHref: (val: string) => val,
    } as any as IStaticAssets)
  ),
});

export const searchConnectorsMock = {
  createStart: createStartMock,
};
