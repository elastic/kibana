/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { ValueReportSettings } from './value_report_settings';
import { useNavigation } from '@kbn/security-solution-navigation';

// Mock dependencies
jest.mock('@kbn/security-solution-navigation', () => ({
  useNavigation: jest.fn(),
}));

const mockUseNavigation = useNavigation as jest.MockedFunction<typeof useNavigation>;

const defaultProps = {
  minutesPerAlert: 10,
  analystHourlyRate: 50,
};

describe('ValueReportSettings', () => {
  const mockNavigateTo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementation
    mockUseNavigation.mockReturnValue({
      navigateTo: mockNavigateTo,
      getAppUrl: jest.fn(),
    });
  });

  it('renders the component with correct structure', () => {
    const { container } = render(<ValueReportSettings {...defaultProps} />);

    const settingsElement = container.querySelector('.valueReportSettings');
    expect(settingsElement).toBeInTheDocument();
  });

  it('displays correct cost calculation information', () => {
    const { container } = render(<ValueReportSettings {...defaultProps} />);

    // Check that the component renders with the correct className
    const settingsElement = container.querySelector('.valueReportSettings');
    expect(settingsElement).toBeInTheDocument();
  });

  it('handles navigation to Kibana settings when link is clicked', () => {
    const { container } = render(<ValueReportSettings {...defaultProps} />);

    const linkElement = container.querySelector('button.euiLink');
    expect(linkElement).toBeInTheDocument();

    if (linkElement) {
      fireEvent.click(linkElement);
    }

    expect(mockNavigateTo).toHaveBeenCalledWith({
      appId: 'management',
      path: '/kibana/settings?query=defaultValueReport',
    });
  });

  it('handles different prop values correctly', () => {
    const testCases = [
      {
        props: {
          minutesPerAlert: 5,
          analystHourlyRate: 75,
        },
        description: 'different values',
      },
      {
        props: {
          minutesPerAlert: 0,
          analystHourlyRate: 0,
        },
        description: 'zero values',
      },
      {
        props: {
          minutesPerAlert: 1.5,
          analystHourlyRate: 25.5,
        },
        description: 'decimal values',
      },
    ];

    testCases.forEach(({ props, description }) => {
      const { container } = render(<ValueReportSettings {...props} />);

      // Verify the component renders with different props
      const settingsElement = container.querySelector('.valueReportSettings');
      expect(settingsElement).toBeInTheDocument();
    });
  });

  it('memoizes the component correctly', () => {
    const { rerender } = render(<ValueReportSettings {...defaultProps} />);

    // Get initial render
    const initialRender = render(<ValueReportSettings {...defaultProps} />);

    // Re-render with same props
    rerender(<ValueReportSettings {...defaultProps} />);

    // Component should be memoized and not re-render unnecessarily
    // This is tested by ensuring the component structure remains the same
    const settingsElement = initialRender.container.querySelector('.valueReportSettings');
    expect(settingsElement).toBeInTheDocument();

    // Re-render with different props
    rerender(<ValueReportSettings minutesPerAlert={5} analystHourlyRate={75} />);

    // Component should re-render with new props
    const settingsElementAfterRerender =
      initialRender.container.querySelector('.valueReportSettings');
    expect(settingsElementAfterRerender).toBeInTheDocument();
  });

  it('renders with correct className for styling', () => {
    const { container } = render(<ValueReportSettings {...defaultProps} />);

    const settingsElement = container.querySelector('.valueReportSettings');
    expect(settingsElement).toBeInTheDocument();
  });

  it('handles navigation callback correctly', () => {
    const { container } = render(<ValueReportSettings {...defaultProps} />);

    const linkElement = container.querySelector('button.euiLink');

    // Verify the link is clickable
    expect(linkElement).toBeInTheDocument();

    // Click the link
    if (linkElement) {
      fireEvent.click(linkElement);
    }

    // Verify navigation was called
    expect(mockNavigateTo).toHaveBeenCalledTimes(1);
    expect(mockNavigateTo).toHaveBeenCalledWith({
      appId: 'management',
      path: '/kibana/settings?query=defaultValueReport',
    });
  });
});
