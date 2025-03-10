/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { screen } from '@testing-library/react';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { NoDataFound } from './no_data_found';
import { TEST_SUBJ_ONBOARDING_SUCCESS_CALLOUT } from '../../constants';
import { renderWithTestProvider } from '../../test/test_provider';

// Mocking components which implementation details are out of scope for this unit test
jest.mock('../../../onboarding/components/onboarding_context', () => ({
  OnboardingContextProvider: () => <div data-test-subj="onboarding-grid" />,
}));
jest.mock('./onboarding_success_callout', () => ({
  OnboardingSuccessCallout: () => (
    <div data-test-subj="asset-inventory-onboarding-success-callout" />
  ),
}));
jest.mock('../../../common/hooks/use_space_id');

describe('NoDataFound Component', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (useSpaceId as jest.Mock).mockReturnValue('default');
  });

  it('should render loading component when spaceId is not available', () => {
    (useSpaceId as jest.Mock).mockReturnValue(null);

    renderWithTestProvider(<NoDataFound />);

    expect(screen.getByTestId('asset-inventory-loading')).toBeInTheDocument();
  });

  it('should render the No Data Found related content when spaceId is available', () => {
    renderWithTestProvider(<NoDataFound />);

    expect(screen.getByText(/start onboarding your assets/i)).toBeInTheDocument();

    expect(screen.getByTestId(TEST_SUBJ_ONBOARDING_SUCCESS_CALLOUT)).toBeInTheDocument();

    expect(screen.getByTestId('onboarding-grid')).toBeInTheDocument();
  });
});
