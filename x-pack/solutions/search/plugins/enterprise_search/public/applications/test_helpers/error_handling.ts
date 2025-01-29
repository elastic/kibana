/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockFlashMessageHelpers } from '../__mocks__/kea_logic';

import { HttpHandler } from '@kbn/core/public';
import { nextTick } from '@kbn/test-jest-helpers';

export const itShowsServerErrorAsFlashMessage = (httpMethod: HttpHandler, callback: () => void) => {
  const { flashAPIErrors } = mockFlashMessageHelpers;
  it('shows any server errors as flash messages', async () => {
    (httpMethod as jest.Mock).mockReturnValueOnce(Promise.reject('error'));
    callback();
    await nextTick();

    expect(flashAPIErrors).toHaveBeenCalledWith('error');
  });
};
