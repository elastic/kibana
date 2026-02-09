/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { FormLocation } from '../types';
import { ConfigKey } from '../types';

jest.mock('../../../hooks/use_monitor_name', () => ({
  useMonitorName: () => ({ nameAlreadyExists: false, validName: '' }),
}));

jest.mock('../../../../../utils/kibana_service', () => ({
  kibanaService: {
    coreStart: {
      docLinks: {
        links: {
          observability: {
            syntheticsCommandReference: 'https://example.com',
          },
        },
      },
    },
    isDev: false,
    isServerless: false,
  },
}));

describe('FIELD[ConfigKey.LOCATIONS] renderOption', () => {
  // FIELD() must be required after mocks are in place
  const { FIELD } = jest.requireActual('./field_config');
  const fieldMap = FIELD();
  const locationField = fieldMap[ConfigKey.LOCATIONS];

  const mockLocations = [
    { id: 'us_central', label: 'US Central', isServiceManaged: true, key: 'us_central' },
    { id: 'us_east', label: 'US East', isServiceManaged: true, key: 'us_east' },
    {
      id: 'private_loc',
      label: 'Private Location',
      isServiceManaged: false,
      key: 'private_loc',
    },
    {
      id: 'invalid_loc',
      label: 'Invalid Location',
      isServiceManaged: true,
      isInvalid: true,
      key: 'invalid_loc',
    },
  ];

  const getRenderOption = () => {
    const props = locationField.props!({
      field: {
        value: {},
        name: ConfigKey.LOCATIONS,
        onChange: jest.fn(),
        onBlur: jest.fn(),
        ref: jest.fn(),
      },
      formState: { defaultValues: {} } as any,
      setValue: jest.fn(),
      trigger: jest.fn(),
      reset: jest.fn(),
      locations: mockLocations as any,
      dependencies: [],
      dependenciesFieldMeta: {} as any,
    });
    return props.renderOption as (option: FormLocation, searchValue: string) => React.ReactNode;
  };

  it('renders option label text that is accessible to screen readers', () => {
    const renderOption = getRenderOption();
    const option: FormLocation = {
      id: 'us_central',
      label: 'US Central',
      isServiceManaged: true,
    };

    const { getByText } = render(<>{renderOption(option, '')}</>);
    expect(getByText('US Central')).toBeInTheDocument();
  });

  it('does not wrap option content in an EuiToolTip', () => {
    const renderOption = getRenderOption();
    const option: FormLocation = {
      id: 'invalid_loc',
      label: 'Invalid Location',
      isServiceManaged: true,
      isInvalid: true,
    };

    const { container } = render(<>{renderOption(option, '')}</>);

    // EuiToolTip renders a span with class 'euiToolTipAnchor' — verify it's absent
    expect(container.querySelector('.euiToolTipAnchor')).not.toBeInTheDocument();
  });

  it('uses span elements instead of div to maintain valid HTML inside button options', () => {
    const renderOption = getRenderOption();
    const option: FormLocation = {
      id: 'us_central',
      label: 'US Central',
      isServiceManaged: true,
    };

    const { container } = render(<>{renderOption(option, '')}</>);

    // The top-level EuiFlexGroup should render as a <span> (component="span")
    const flexGroup = container.firstElementChild;
    expect(flexGroup?.tagName).toBe('SPAN');

    // No div elements should be present inside the rendered option
    // (EuiFlexGroup/EuiFlexItem with component="span" render as span, not div)
    expect(container.querySelectorAll('div')).toHaveLength(0);
  });

  it('shows "Invalid" badge for invalid locations', () => {
    const renderOption = getRenderOption();
    const option: FormLocation = {
      id: 'invalid_loc',
      label: 'Invalid Location',
      isServiceManaged: true,
      isInvalid: true,
    };

    const { getByText } = render(<>{renderOption(option, '')}</>);
    expect(getByText('Invalid')).toBeInTheDocument();
  });

  it('shows "Private" badge for non-service-managed locations', () => {
    const renderOption = getRenderOption();
    const option: FormLocation = {
      id: 'private_loc',
      label: 'Private Location',
      isServiceManaged: false,
    };

    const { getByText } = render(<>{renderOption(option, '')}</>);
    expect(getByText('Private')).toBeInTheDocument();
  });

  it('does not show "Private" badge for service-managed locations', () => {
    const renderOption = getRenderOption();
    const option: FormLocation = {
      id: 'us_central',
      label: 'US Central',
      isServiceManaged: true,
    };

    const { queryByText } = render(<>{renderOption(option, '')}</>);
    expect(queryByText('Private')).not.toBeInTheDocument();
  });

  it('highlights matching search text in the option label', () => {
    const renderOption = getRenderOption();
    const option: FormLocation = {
      id: 'us_central',
      label: 'US Central',
      isServiceManaged: true,
    };

    const { container } = render(<>{renderOption(option, 'Central')}</>);

    // EuiHighlight wraps matching text in a <mark> element
    const mark = container.querySelector('mark');
    expect(mark).toBeInTheDocument();
    expect(mark?.textContent).toBe('Central');
  });
});
