/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import {
  TestDataQualityProviders,
  TestExternalProviders,
} from '../mock/test_providers/test_providers';
import { DataQualityDetails } from '.';

const ilmPhases = ['hot', 'warm', 'unmanaged'];

describe('DataQualityDetails', () => {
  describe('when ILM phases are provided', () => {
    beforeEach(async () => {
      jest.clearAllMocks();

      render(
        <TestExternalProviders>
          <TestDataQualityProviders dataQualityContextProps={{ ilmPhases }}>
            <DataQualityDetails />
          </TestDataQualityProviders>
        </TestExternalProviders>
      );

      await waitFor(() => {}); // wait for PatternComponent state updates
    });

    test('it renders the storage details', () => {
      expect(screen.getByTestId('storageDetails')).toBeInTheDocument();
    });

    test('it renders the indices details', () => {
      expect(screen.getByTestId('indicesDetails')).toBeInTheDocument();
    });
  });

  describe('when ILM phases are are empty', () => {
    beforeEach(() => {
      jest.clearAllMocks();

      render(
        <TestExternalProviders>
          <TestDataQualityProviders dataQualityContextProps={{ ilmPhases: [] }}>
            <DataQualityDetails />
          </TestDataQualityProviders>
        </TestExternalProviders>
      );
    });

    test('it renders an empty prompt when ilmPhases is empty', () => {
      expect(screen.getByTestId('ilmPhasesEmptyPrompt')).toBeInTheDocument();
    });

    test('it does NOT render the storage details', () => {
      expect(screen.queryByTestId('storageDetails')).not.toBeInTheDocument();
    });

    test('it does NOT render the indices details', () => {
      expect(screen.queryByTestId('indicesDetails')).not.toBeInTheDocument();
    });
  });
});
