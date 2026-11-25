/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEnabledProfilingStatus } from '../../components/contexts/profiling_status/use_enabled_profiling_status';
import {
  OTEL_NOT_SUPPORTED_CALLOUT_BODY,
  OTEL_NOT_SUPPORTED_CALLOUT_DISMISSED_STORAGE_KEY,
  OTEL_NOT_SUPPORTED_CALLOUT_TITLE,
  OtelNotSupportedCallout,
} from './otel_not_supported_callout';

jest.mock('../../components/contexts/profiling_status/use_enabled_profiling_status');

describe('OtelNotSupportedCallout', () => {
  const mockOtelHasData = (hasData: boolean) =>
    jest.mocked(useEnabledProfilingStatus).mockReturnValue({
      data: {
        isEnabled: true,
        otel: { isAvailable: true, hasData },
        universalProfiling: {
          isAvailable: true,
          hasSetup: true,
          hasData: true,
          hasLegacyData: false,
        },
      },
      refresh: jest.fn(),
    });

  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders when there is OpenTelemetry profiling data', () => {
    mockOtelHasData(true);

    render(<OtelNotSupportedCallout />);

    expect(screen.getByText(OTEL_NOT_SUPPORTED_CALLOUT_TITLE)).toBeInTheDocument();
    expect(screen.getByText(OTEL_NOT_SUPPORTED_CALLOUT_BODY)).toBeInTheDocument();
  });

  it('does not render without OpenTelemetry profiling data', () => {
    mockOtelHasData(false);

    render(<OtelNotSupportedCallout />);

    expect(screen.queryByText(OTEL_NOT_SUPPORTED_CALLOUT_TITLE)).not.toBeInTheDocument();
  });

  it('hides and remembers the dismissal when dismissed', async () => {
    mockOtelHasData(true);

    render(<OtelNotSupportedCallout />);
    await userEvent.click(
      screen.getByTestId('profilingStorageExplorerOtelNotSupportedCalloutDismissButton')
    );

    expect(screen.queryByText(OTEL_NOT_SUPPORTED_CALLOUT_TITLE)).not.toBeInTheDocument();
    expect(window.localStorage.getItem(OTEL_NOT_SUPPORTED_CALLOUT_DISMISSED_STORAGE_KEY)).toBe(
      'true'
    );
  });

  it('does not render once dismissed', () => {
    mockOtelHasData(true);
    window.localStorage.setItem(OTEL_NOT_SUPPORTED_CALLOUT_DISMISSED_STORAGE_KEY, 'true');

    render(<OtelNotSupportedCallout />);

    expect(screen.queryByText(OTEL_NOT_SUPPORTED_CALLOUT_TITLE)).not.toBeInTheDocument();
  });
});
