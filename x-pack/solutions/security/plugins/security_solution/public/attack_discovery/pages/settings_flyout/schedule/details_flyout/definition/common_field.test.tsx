/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { CommonField } from './common_field';
import { TestProviders } from '../../../../../../common/mock';

describe('CommonField', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render value', () => {
    render(
      <TestProviders>
        {<CommonField value={'Test field value'} data-test-subj="testField" />}
      </TestProviders>
    );
    expect(screen.getByTestId('testField')).toHaveTextContent('Test field value');
  });
});
