/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

jest.mock('../../../../../app_logic', () => ({
  AppLogic: { values: { isOrganization: true } },
}));
import { AppLogic } from '../../../../../app_logic';

import { addCustomSource } from './add_custom_source_api_logic';

describe('addCustomSource', () => {
  const { http } = mockHttpValues;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls correct route for organization', async () => {
    const promise = Promise.resolve('result');
    http.post.mockReturnValue(promise);
    addCustomSource({ name: 'name', baseServiceType: 'baseServiceType' });
    await nextTick();
    expect(http.post).toHaveBeenCalledWith('/internal/workplace_search/org/create_source', {
      body: JSON.stringify({
        service_type: 'custom',
        name: 'name',
        base_service_type: 'baseServiceType',
      }),
    });
  });
  it('calls correct route for account', async () => {
    const promise = Promise.resolve('result');
    AppLogic.values.isOrganization = false;
    http.post.mockReturnValue(promise);
    addCustomSource({ name: 'name' });
    await nextTick();
    expect(http.post).toHaveBeenCalledWith('/internal/workplace_search/account/create_source', {
      body: JSON.stringify({ service_type: 'custom', name: 'name' }),
    });
  });
});
