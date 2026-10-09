/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { EnabledProfilingStatus, ProfilingStatus } from '@kbn/profiling-utils';

jest.mock('../../../components/contexts/profiling_status/use_profiling_status');
jest.mock('./universal_profiling_add_data_instructions', () => ({
  UniversalProfilingAddDataInstructions: () => (
    <div data-test-subj="universalProfilingAddDataInstructions" />
  ),
}));
jest.mock('./universal_profiling_delete_data_instructions', () => ({
  UniversalProfilingDeleteDataInstructions: () => (
    <div data-test-subj="universalProfilingDeleteDataInstructions" />
  ),
}));
jest.mock('./universal_profiling_setup_prompt', () => ({
  UniversalProfilingSetupPrompt: () => <div data-test-subj="universalProfilingSetupPrompt" />,
}));

import { AsyncStatus } from '../../../hooks/use_async';
import { useProfilingStatus } from '../../../components/contexts/profiling_status/use_profiling_status';
import { UniversalProfilingAddData } from './universal_profiling_add_data';

const makeStatus = (
  universalProfiling: Partial<EnabledProfilingStatus['universalProfiling']>
): EnabledProfilingStatus => ({
  isEnabled: true,
  otel: { isAvailable: true, hasData: false },
  universalProfiling: {
    isAvailable: true,
    hasSetup: true,
    hasData: false,
    hasLegacyData: false,
    canSetup: true,
    ...universalProfiling,
  },
});

describe('UniversalProfilingAddData', () => {
  const renderWithStatus = (data: ProfilingStatus) => {
    (useProfilingStatus as jest.Mock).mockReturnValue({
      status: AsyncStatus.Settled,
      data,
      refresh: jest.fn(),
    });
    render(<UniversalProfilingAddData />);
  };

  it.each([
    ['Universal Profiling is set up', makeStatus({ hasData: true, hasLegacyData: true })],
    [
      'Universal Profiling is not set up',
      makeStatus({ hasSetup: false, hasData: true, hasLegacyData: true }),
    ],
  ])(
    'shows the deletion instructions when there is data from before 8.9.1 and %s',
    (_name, data) => {
      renderWithStatus(data);

      expect(screen.getByTestId('universalProfilingDeleteDataInstructions')).toBeInTheDocument();
      expect(screen.queryByTestId('universalProfilingSetupPrompt')).not.toBeInTheDocument();
      expect(screen.queryByTestId('universalProfilingAddDataInstructions')).not.toBeInTheDocument();
    }
  );

  it('prompts to set up Universal Profiling when it is not set up', () => {
    renderWithStatus(makeStatus({ hasSetup: false }));

    expect(screen.getByTestId('universalProfilingSetupPrompt')).toBeInTheDocument();
    expect(screen.queryByTestId('universalProfilingAddDataInstructions')).not.toBeInTheDocument();
  });

  it.each([
    ['without data', makeStatus({})],
    ['with data', makeStatus({ hasData: true })],
  ])('shows the add data instructions when Universal Profiling is set up %s', (_name, data) => {
    renderWithStatus(data);

    expect(screen.getByTestId('universalProfilingAddDataInstructions')).toBeInTheDocument();
    expect(screen.queryByTestId('universalProfilingSetupPrompt')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('universalProfilingDeleteDataInstructions')
    ).not.toBeInTheDocument();
  });
});
