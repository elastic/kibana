/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { IOCDetails } from '.';
import { useIndicatorById } from '../../cases/attachments/indicator/hooks/use_indicator_by_id';
import { generateMockIndicator } from '../../../common/threat_intelligence/types/indicator';
import { TestProviders } from '../../common/mock';
import {
  IOC_DETAILS_LOADING_TEST_ID,
  IOC_DETAILS_ERROR_TEST_ID,
  IOC_DETAILS_TITLE_TEST_ID,
  IOC_DETAILS_FOOTER_TEST_ID,
} from './test_ids';

jest.mock('../../cases/attachments/indicator/hooks/use_indicator_by_id');

const mockIndicator = generateMockIndicator();

const renderIOCDetails = () =>
  render(
    <TestProviders>
      <IOCDetails id="test-id" />
    </TestProviders>
  );

describe('<IOCDetails />', () => {
  it('should render loading state', () => {
    (useIndicatorById as jest.Mock).mockReturnValue({
      indicator: undefined,
      isLoading: true,
    });

    const { getByTestId, queryByTestId } = renderIOCDetails();

    expect(getByTestId(IOC_DETAILS_LOADING_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(IOC_DETAILS_TITLE_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render error state when indicator is not found', () => {
    (useIndicatorById as jest.Mock).mockReturnValue({
      indicator: undefined,
      isLoading: false,
    });

    const { getByTestId, queryByTestId } = renderIOCDetails();

    expect(getByTestId(IOC_DETAILS_ERROR_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(IOC_DETAILS_TITLE_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render header, content, and footer when indicator is loaded', () => {
    (useIndicatorById as jest.Mock).mockReturnValue({
      indicator: mockIndicator,
      isLoading: false,
    });

    const { getByTestId, queryByTestId } = renderIOCDetails();

    expect(getByTestId(IOC_DETAILS_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(IOC_DETAILS_FOOTER_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(IOC_DETAILS_LOADING_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(IOC_DETAILS_ERROR_TEST_ID)).not.toBeInTheDocument();
  });
});
