/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import * as i18n from '../translations';

import { NoData } from '.';
import { TestExternalProviders } from '../../../../mock/test_providers/test_providers';

describe('NoData', () => {
  test('renders the expected "no data" message', () => {
    render(
      <TestExternalProviders>
        <NoData />
      </TestExternalProviders>
    );

    expect(screen.getByText(i18n.NO_DATA_LABEL)).toBeInTheDocument();
  });
});
