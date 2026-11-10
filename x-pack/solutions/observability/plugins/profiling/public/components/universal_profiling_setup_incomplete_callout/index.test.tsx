/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { EnabledProfilingStatus } from '@kbn/profiling-utils';
import { ProfilingSchema } from '@kbn/profiling-utils';
import { useEnabledProfilingStatus } from '../contexts/profiling_status/use_enabled_profiling_status';
import { useProfilingRouter } from '../../hooks/use_profiling_router';
import {
  SETUP_INCOMPLETE_CALLOUT_ACTION,
  SETUP_INCOMPLETE_CALLOUT_TEXT,
  SETUP_INCOMPLETE_CALLOUT_TEXT_WITHOUT_PRIVILEGES,
  SETUP_INCOMPLETE_CALLOUT_TITLE,
  UniversalProfilingSetupIncompleteCallout,
} from '.';

jest.mock('../contexts/profiling_status/use_enabled_profiling_status');
jest.mock('../../hooks/use_profiling_router');

describe('UniversalProfilingSetupIncompleteCallout', () => {
  const link = jest.fn().mockReturnValue('/app/profiling/add-data-instructions?schema=ecs');

  const mockUniversalProfilingStatus = (
    universalProfiling: Partial<EnabledProfilingStatus['universalProfiling']>
  ) =>
    jest.mocked(useEnabledProfilingStatus).mockReturnValue({
      data: {
        isEnabled: true,
        otel: { isAvailable: true, hasData: false },
        universalProfiling: {
          isAvailable: true,
          hasSetup: false,
          hasData: true,
          hasLegacyData: false,
          canSetup: true,
          ...universalProfiling,
        },
      },
      refresh: jest.fn(),
    });

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(useProfilingRouter)
      .mockReturnValue({ link } as unknown as ReturnType<typeof useProfilingRouter>);
  });

  it('links to the Universal Profiling setup when the user can run it', () => {
    mockUniversalProfilingStatus({ canSetup: true });

    render(<UniversalProfilingSetupIncompleteCallout />);

    expect(screen.getByText(SETUP_INCOMPLETE_CALLOUT_TITLE)).toBeInTheDocument();
    expect(screen.getByText(SETUP_INCOMPLETE_CALLOUT_TEXT)).toBeInTheDocument();
    expect(
      screen.getByTestId('profilingSetupIncompleteCalloutCompleteSetupButton')
    ).toHaveAttribute('href', '/app/profiling/add-data-instructions?schema=ecs');
    expect(screen.getByText(SETUP_INCOMPLETE_CALLOUT_ACTION)).toBeInTheDocument();
    expect(link).toHaveBeenCalledWith('/add-data-instructions', {
      query: { schema: ProfilingSchema.ECS },
    });
  });

  it('asks to contact an administrator when the user cannot run the setup', () => {
    mockUniversalProfilingStatus({ canSetup: false });

    render(<UniversalProfilingSetupIncompleteCallout />);

    expect(screen.getByText(SETUP_INCOMPLETE_CALLOUT_TITLE)).toBeInTheDocument();
    expect(screen.getByText(SETUP_INCOMPLETE_CALLOUT_TEXT_WITHOUT_PRIVILEGES)).toBeInTheDocument();
    expect(
      screen.queryByTestId('profilingSetupIncompleteCalloutCompleteSetupButton')
    ).not.toBeInTheDocument();
  });

  it.each([
    ['the setup is complete', { hasSetup: true }],
    ['there is no Universal Profiling data', { hasData: false }],
    ['there is data from before 8.9.1', { hasLegacyData: true }],
    ['Universal Profiling is not available', { isAvailable: false }],
  ])('does not render when %s', (_name, universalProfiling) => {
    mockUniversalProfilingStatus(universalProfiling);

    render(<UniversalProfilingSetupIncompleteCallout />);

    expect(screen.queryByTestId('profilingSetupIncompleteCallout')).not.toBeInTheDocument();
  });
});
