/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DATA_VIEW_ERROR_TEST_ID, Wrapper } from './wrapper';
import { TestProviders } from '../../../common/mock';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';

jest.mock('../../../common/hooks/use_experimental_features');
jest.mock('./content', () => ({
  AttacksPageContent: () => <div data-test-subj={'attacks-page-content'} />,
}));

describe('<Wrapper />', () => {
  describe('newDataViewPickerEnabled false', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
    });

    it('should render an error', async () => {
      render(
        <TestProviders>
          <Wrapper />
        </TestProviders>
      );

      expect(await screen.findByTestId(DATA_VIEW_ERROR_TEST_ID)).toHaveTextContent(
        'Unable to retrieve the data view'
      );
    });
  });

  describe('newDataViewPickerEnabled true', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    });

    it('should render the content', async () => {
      render(
        <TestProviders>
          <Wrapper />
        </TestProviders>
      );

      expect(await screen.findByTestId('attacks-page-content')).toBeInTheDocument();
    });
  });
});
