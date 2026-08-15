/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deletePrivateLocationEffect } from './effects';
import { deleteSyntheticsPrivateLocation } from './api';
import { deletePrivateLocationAction } from './actions';
import { fetchEffectFactory } from '../utils/fetch_effect';

jest.mock('../utils/fetch_effect', () => ({
  fetchEffectFactory: jest.fn(() => function* noop() {}),
}));

describe('deletePrivateLocationEffect', () => {
  // Regression guard for #276922: a delete must surface a toast so screen
  // readers announce completion via the toast aria-live region.
  it('wires success and failure toast messages into the fetch effect', () => {
    deletePrivateLocationEffect().next();

    expect(fetchEffectFactory).toHaveBeenCalledWith(
      deleteSyntheticsPrivateLocation,
      deletePrivateLocationAction.success,
      deletePrivateLocationAction.fail,
      'Successfully deleted private location.',
      'Failed to delete private location.'
    );
  });
});
