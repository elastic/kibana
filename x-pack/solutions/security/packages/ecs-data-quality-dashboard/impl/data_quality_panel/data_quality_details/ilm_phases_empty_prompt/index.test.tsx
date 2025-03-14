/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { TestExternalProviders } from '../../mock/test_providers/test_providers';
import { IlmPhasesEmptyPrompt } from '.';

describe('IlmPhasesEmptyPrompt', () => {
  beforeEach(() => {
    render(
      <TestExternalProviders>
        <IlmPhasesEmptyPrompt />
      </TestExternalProviders>
    );
  });

  test('it renders the expected content', () => {
    expect(screen.getByTestId('ilmPhasesEmptyPrompt')).toHaveTextContent(
      "ILM phases that can be checked for data qualityhot: The index is actively being updated and queriedwarm: The index is no longer being updated but is still being queriedunmanaged: The index isn't managed by Index Lifecycle Management (ILM)ILM phases that cannot be checkedThe following ILM phases cannot be checked for data quality because they are slower to accesscold: The index is no longer being updated and is queried infrequently. The information still needs to be searchable, but it’s okay if those queries are slower.frozen: The index is no longer being updated and is queried rarely. The information still needs to be searchable, but it's okay if those queries are extremely slow."
    );
  });
});
