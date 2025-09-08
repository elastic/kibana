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

  it('handles navigation callback correctly', () => {
    const { container } = render(<ValueReportSettings {...defaultProps} />);

    const linkElement = container.querySelector('button.euiLink');
    expect(linkElement).toBeInTheDocument();
    if (linkElement) {
      fireEvent.click(linkElement);
    }
    expect(mockNavigateTo).toHaveBeenCalledTimes(1);
    expect(mockNavigateTo).toHaveBeenCalledWith({
      appId: 'management',
      path: '/kibana/settings?query=defaultValueReport',
    });
  });
});
