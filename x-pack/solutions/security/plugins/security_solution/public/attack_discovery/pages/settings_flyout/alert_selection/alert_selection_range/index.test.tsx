/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { AlertSelectionRange } from '.';
import { useKibana } from '../../../../../common/lib/kibana';
import { SEND_FEWER_ALERTS, SET_NUMBER_OF_ALERTS_TO_ANALYZE } from '../translations';

jest.mock('../../../../../common/lib/kibana');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const defaultProps = {
  maxAlerts: 100,
  setMaxAlerts: jest.fn(),
};

describe('AlertSelectionRange', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        featureFlags: {
          getBooleanValue: jest.fn().mockReturnValue(true),
        },
      },
    } as unknown as jest.Mocked<ReturnType<typeof useKibana>>);
  });

  it('renders the title when the feature flag is false', () => {
    const featureFlag = false;

    mockUseKibana.mockReturnValue({
      services: {
        featureFlags: {
          getBooleanValue: jest.fn().mockReturnValue(featureFlag),
        },
      },
    } as unknown as jest.Mocked<ReturnType<typeof useKibana>>);

    render(<AlertSelectionRange {...defaultProps} />);

    expect(screen.getByTestId('title')).toHaveTextContent(SET_NUMBER_OF_ALERTS_TO_ANALYZE);
  });

  it('does NOT render the title when the feature flag is true', () => {
    render(<AlertSelectionRange {...defaultProps} />);

    expect(screen.queryByTestId('title')).not.toBeInTheDocument();
  });

  it('renders the AlertsRange', () => {
    render(<AlertSelectionRange {...defaultProps} />);

    expect(screen.getByTestId('alertsRange')).toBeInTheDocument();
  });

  it('renders the send fewer alerts text', () => {
    render(<AlertSelectionRange {...defaultProps} />);

    expect(screen.getByTestId('sendFewerAlerts')).toHaveTextContent(SEND_FEWER_ALERTS);
  });
});
