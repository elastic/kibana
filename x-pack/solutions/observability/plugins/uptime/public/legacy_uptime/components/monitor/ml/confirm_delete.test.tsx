/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
import { ConfirmJobDeletion } from './confirm_delete';

describe('ML Confirm Job Delete', () => {
  it('shallow renders without errors', () => {
    const wrapper = shallowWithIntl(
      <ConfirmJobDeletion loading={false} onConfirm={jest.fn()} onCancel={jest.fn()} />
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('shallow renders without errors while loading', () => {
    const wrapper = shallowWithIntl(
      <ConfirmJobDeletion loading={true} onConfirm={jest.fn()} onCancel={jest.fn()} />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
