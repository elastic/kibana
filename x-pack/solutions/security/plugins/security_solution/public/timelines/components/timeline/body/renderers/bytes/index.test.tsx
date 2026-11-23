/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { TestProviders } from '../../../../../../common/mock';

import { Bytes } from '.';

jest.mock('../../../../../../common/lib/kibana');

describe('Bytes', () => {
  test('it renders the expected formatted bytes', () => {
    const { container } = render(
      <TestProviders>
        <Bytes value={`1234567`} />
      </TestProviders>
    );
    expect(container.textContent).toEqual('1.2MB');
  });
});
