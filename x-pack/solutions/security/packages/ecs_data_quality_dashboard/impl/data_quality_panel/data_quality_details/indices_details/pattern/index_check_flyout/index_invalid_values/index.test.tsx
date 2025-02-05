/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { TestExternalProviders } from '../../../../../mock/test_providers/test_providers';
import { UnallowedValueCount } from '../../../../../types';
import { IndexInvalidValues } from '.';
import { EMPTY_PLACEHOLDER } from '../../../../../constants';

describe('IndexInvalidValues', () => {
  test('it renders a placeholder with the expected content when `indexInvalidValues` is empty', () => {
    render(
      <TestExternalProviders>
        <IndexInvalidValues indexInvalidValues={[]} />
      </TestExternalProviders>
    );

    expect(screen.getByTestId('emptyPlaceholder')).toHaveTextContent(EMPTY_PLACEHOLDER);
  });

  test('it renders the expected field names and counts when the index has invalid values', () => {
    const indexInvalidValues: UnallowedValueCount[] = [
      {
        count: 2,
        fieldName: 'an_invalid_category',
      },
      {
        count: 1,
        fieldName: 'theory',
      },
    ];

    render(
      <TestExternalProviders>
        <IndexInvalidValues indexInvalidValues={indexInvalidValues} />
      </TestExternalProviders>
    );

    expect(screen.getByTestId('indexInvalidValues')).toHaveTextContent(
      'an_invalid_category (2)theory (1)'
    );
  });
});
