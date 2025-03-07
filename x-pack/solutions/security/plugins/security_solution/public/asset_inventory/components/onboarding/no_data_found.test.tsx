/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { TestProvider } from '../../test/test_provider';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { useNoDataFound } from './hooks/use_no_data_found';
import { NoDataFound } from './no_data_found';
import { userEvent } from '@testing-library/user-event';

jest.mock('../../../common/hooks/use_space_id');
jest.mock('./hooks/use_no_data_found');

const mockNoDataFound = {
  isCalloutVisible: true,
  onHideCallout: jest.fn(),
  renderIntegrationsExplorer: () => <div data-test-subj="epmList.integrationCards" />,
};

const renderWithProvider = (children: React.ReactNode) => {
  return render(<TestProvider>{children}</TestProvider>);
};

describe('NoDataFound Component', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (useSpaceId as jest.Mock).mockReturnValue('default');
    (useNoDataFound as jest.Mock).mockReturnValue(mockNoDataFound);
  });

  it('should render loading component when spaceId is not available', () => {
    (useSpaceId as jest.Mock).mockReturnValue(null);

    renderWithProvider(<NoDataFound />);

    expect(screen.getByTestId('asset-inventory-loading')).toBeInTheDocument();
  });

  it('should render NoDataFound content when spaceId is available', () => {
    renderWithProvider(<NoDataFound />);

    expect(screen.getByText(/entity store installed successfully/i)).toBeInTheDocument();

    expect(screen.getByText(/start onboarding your assets/i)).toBeInTheDocument();

    expect(screen.getByTestId('epmList.integrationCards')).toBeInTheDocument();
  });

  it('should not render callout when isCalloutVisible is false', () => {
    (useNoDataFound as jest.Mock).mockReturnValue({ ...mockNoDataFound, isCalloutVisible: false });

    renderWithProvider(<NoDataFound />);

    expect(screen.queryByText(/entity store installed successfully/i)).toBeNull();
  });
  it('should call onHideCallout when callout is dismissed', async () => {
    renderWithProvider(<NoDataFound />);

    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }));

    await waitFor(() => {
      expect(mockNoDataFound.onHideCallout).toHaveBeenCalled();
    });
  });
});
