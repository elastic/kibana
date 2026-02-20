/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { GroupBySelect } from './group_by_select';
import { GroupByOptions } from '../../types';

// Wrapper component to provide necessary context
const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <EuiThemeProvider>
    <I18nProvider>{children}</I18nProvider>
  </EuiThemeProvider>
);

describe('GroupBySelect', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the filter button with "None" as default selection', () => {
    const { getByTestId, getByText } = render(
      <Wrapper>
        <GroupBySelect value={GroupByOptions.None} onChange={mockOnChange} />
      </Wrapper>
    );

    expect(getByTestId('group-by-select')).toBeInTheDocument();
    expect(getByText(/Group:/i)).toBeInTheDocument();
    expect(getByText(/None/i)).toBeInTheDocument();
  });

  it('should render the filter button with "Models" when model_id is selected', () => {
    const { getByText } = render(
      <Wrapper>
        <GroupBySelect value={GroupByOptions.Model} onChange={mockOnChange} />
      </Wrapper>
    );

    expect(getByText(/Group:/i)).toBeInTheDocument();
    expect(getByText(/Models/i)).toBeInTheDocument();
  });

  it('should open the popover when the filter button is clicked', async () => {
    const { getByRole } = render(
      <Wrapper>
        <GroupBySelect value={GroupByOptions.None} onChange={mockOnChange} />
      </Wrapper>
    );

    const filterButton = getByRole('button');
    fireEvent.click(filterButton);

    await waitFor(() => {
      // Both options should be visible in the popover
      const options = document.querySelectorAll('[role="option"]');
      expect(options.length).toBeGreaterThan(0);
    });
  });

  it('should close the popover when the filter button is clicked again', async () => {
    const { getByRole } = render(
      <Wrapper>
        <GroupBySelect value={GroupByOptions.None} onChange={mockOnChange} />
      </Wrapper>
    );

    const filterButton = getByRole('button');

    // Open popover
    fireEvent.click(filterButton);
    await waitFor(() => {
      expect(document.querySelector('[role="option"]')).toBeInTheDocument();
    });

    // Close popover
    fireEvent.click(filterButton);
    await waitFor(() => {
      expect(document.querySelector('[role="option"]')).not.toBeInTheDocument();
    });
  });

  it('should call onChange with GroupByOptions.Model when "Models" option is selected', async () => {
    const { getByRole } = render(
      <Wrapper>
        <GroupBySelect value={GroupByOptions.None} onChange={mockOnChange} />
      </Wrapper>
    );

    // Open popover
    const filterButton = getByRole('button');
    fireEvent.click(filterButton);

    await waitFor(() => {
      const options = document.querySelectorAll('[role="option"]');
      expect(options.length).toBeGreaterThan(0);
    });

    // Find and click the "Models" option
    const options = document.querySelectorAll('[role="option"]');
    const modelsOption = Array.from(options).find((option) =>
      option.textContent?.includes('Models')
    );

    expect(modelsOption).toBeDefined();
    if (modelsOption) {
      fireEvent.click(modelsOption);
    }

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(GroupByOptions.Model);
    });
  });

  it('should call onChange with GroupByOptions.None when "None" option is selected', async () => {
    const { getByRole } = render(
      <Wrapper>
        <GroupBySelect value={GroupByOptions.Model} onChange={mockOnChange} />
      </Wrapper>
    );

    // Open popover
    const filterButton = getByRole('button');
    fireEvent.click(filterButton);

    await waitFor(() => {
      const options = document.querySelectorAll('[role="option"]');
      expect(options.length).toBeGreaterThan(0);
    });

    // Find and click the "None" option
    const options = document.querySelectorAll('[role="option"]');
    const noneOption = Array.from(options).find((option) => option.textContent?.includes('None'));

    expect(noneOption).toBeDefined();
    if (noneOption) {
      fireEvent.click(noneOption);
    }

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(GroupByOptions.None);
    });
  });

  it('should close the popover after selecting an option', async () => {
    const { getByRole } = render(
      <Wrapper>
        <GroupBySelect value={GroupByOptions.None} onChange={mockOnChange} />
      </Wrapper>
    );

    // Open popover
    const filterButton = getByRole('button');
    fireEvent.click(filterButton);

    await waitFor(() => {
      expect(document.querySelector('[role="option"]')).toBeInTheDocument();
    });

    // Select an option
    const options = document.querySelectorAll('[role="option"]');
    const modelsOption = Array.from(options).find((option) =>
      option.textContent?.includes('Models')
    );

    if (modelsOption) {
      fireEvent.click(modelsOption);
    }

    // Popover should close after selection
    await waitFor(() => {
      expect(document.querySelector('[role="option"]')).not.toBeInTheDocument();
    });
  });

  it('should mark the current selection as checked', async () => {
    const { getByRole } = render(
      <Wrapper>
        <GroupBySelect value={GroupByOptions.Model} onChange={mockOnChange} />
      </Wrapper>
    );

    // Open popover
    const filterButton = getByRole('button');
    fireEvent.click(filterButton);

    await waitFor(() => {
      const options = document.querySelectorAll('[role="option"]');
      expect(options.length).toBe(2);
    });

    // Check that the "Models" option is marked as checked
    const options = document.querySelectorAll('[role="option"]');
    const modelsOption = Array.from(options).find((option) =>
      option.textContent?.includes('Models')
    ) as HTMLElement;

    expect(modelsOption).toBeDefined();
    if (modelsOption) {
      expect(modelsOption.getAttribute('aria-selected')).toBe('true');
    }
  });
});
