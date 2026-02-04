/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { SortButton } from './sort_button';
import { SortFieldInferenceEndpoint } from '../types';

describe('SortButton', () => {
  const defaultProps = {
    selectedSortField: SortFieldInferenceEndpoint.inference_id,
    onSortFieldChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the sort button', () => {
    const { getByTestId } = render(<SortButton {...defaultProps} />);
    expect(getByTestId('sortButton')).toBeInTheDocument();
  });

  it('should toggle the popover when the sort button is clicked', async () => {
    const { getByTestId, queryByText } = render(<SortButton {...defaultProps} />);
    fireEvent.click(getByTestId('sortButton'));
    expect(queryByText('Endpoint')).toBeInTheDocument();
    fireEvent.click(getByTestId('sortButton'));
    await waitFor(() => {
      expect(queryByText('Endpoint')).not.toBeInTheDocument();
    });
  });

  it('should render all sort options', async () => {
    const { getByTestId, getByText } = render(<SortButton {...defaultProps} />);

    fireEvent.click(getByTestId('sortButton'));

    await waitFor(() => {
      expect(getByText('Endpoint')).toBeInTheDocument();
      expect(getByText('Service')).toBeInTheDocument();
      expect(getByText('Type')).toBeInTheDocument();
      expect(getByText('Model')).toBeInTheDocument();
    });
  });

  it('should call onSortFieldChange when a sort option is selected', async () => {
    const onSortFieldChange = jest.fn();
    const { getByTestId, getByText } = render(
      <SortButton {...defaultProps} onSortFieldChange={onSortFieldChange} />
    );

    fireEvent.click(getByTestId('sortButton'));
    fireEvent.click(getByText('Service'));

    await waitFor(() => {
      expect(onSortFieldChange).toHaveBeenCalledWith(SortFieldInferenceEndpoint.service);
    });
  });

  it('should show selected sort field in dropdown', async () => {
    const { getByTestId, getByText } = render(
      <SortButton {...defaultProps} selectedSortField={SortFieldInferenceEndpoint.service} />
    );

    fireEvent.click(getByTestId('sortButton'));

    await waitFor(() => {
      // Verify the dropdown opens and shows all options including the selected one
      expect(getByText('Service')).toBeInTheDocument();
      expect(getByText('Endpoint')).toBeInTheDocument();
    });
  });

  it('should close popover after selecting an option', async () => {
    const onSortFieldChange = jest.fn();
    const { getByTestId, getByText, queryByText } = render(
      <SortButton {...defaultProps} onSortFieldChange={onSortFieldChange} />
    );

    fireEvent.click(getByTestId('sortButton'));
    expect(queryByText('Service')).toBeInTheDocument();

    fireEvent.click(getByText('Service'));

    await waitFor(() => {
      expect(queryByText('Service')).not.toBeInTheDocument();
    });
  });
});
