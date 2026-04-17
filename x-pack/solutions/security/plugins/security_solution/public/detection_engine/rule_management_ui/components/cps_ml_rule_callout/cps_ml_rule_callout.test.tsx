/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { ICPSManager } from '@kbn/cps-utils';
import { PROJECT_ROUTING } from '@kbn/cps-utils';

import type { StartServices } from '../../../../types';
import { TestProviders, kibanaMock } from '../../../../common/mock';
import { CpsMlRuleCallout } from './callout';

const createCpsManager = ({
  totalProjectCount,
  defaultProjectRouting = PROJECT_ROUTING.ALL,
}: {
  totalProjectCount: number;
  defaultProjectRouting?: string;
}): ICPSManager =>
  ({
    whenReady: jest.fn().mockResolvedValue(undefined),
    getTotalProjectCount: jest.fn().mockReturnValue(totalProjectCount),
    getDefaultProjectRouting: jest.fn().mockReturnValue(defaultProjectRouting),
  } as unknown as ICPSManager);

const startServicesWithProjectCount = (
  totalProjectCount: number,
  defaultProjectRouting: string = PROJECT_ROUTING.ALL
): StartServices => ({
  ...kibanaMock,
  cps: {
    cpsManager: createCpsManager({ totalProjectCount, defaultProjectRouting }),
  },
});

describe('CpsMlRuleCallout', () => {
  it('renders when total project count is 2 and space default routing includes linked projects', async () => {
    render(
      <TestProviders startServices={startServicesWithProjectCount(2)}>
        <CpsMlRuleCallout />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('callout-cps-ml-rule')).toBeInTheDocument();
    });
  });

  it('does not render when total project count is 1', async () => {
    const startServices = startServicesWithProjectCount(1);
    const cpsManager = startServices.cps!.cpsManager!;

    render(
      <TestProviders startServices={startServices}>
        <CpsMlRuleCallout />
      </TestProviders>
    );

    await waitFor(() => {
      expect(cpsManager.whenReady).toHaveBeenCalled();
    });
    expect(screen.queryByTestId('callout-cps-ml-rule')).not.toBeInTheDocument();
  });

  it('does not render when CPS is not available (no cpsManager)', () => {
    render(
      <TestProviders startServices={kibanaMock}>
        <CpsMlRuleCallout />
      </TestProviders>
    );

    expect(screen.queryByTestId('callout-cps-ml-rule')).not.toBeInTheDocument();
  });

  it('does not render when total project count is 2 but space is limited to origin only', async () => {
    const startServices = startServicesWithProjectCount(2, PROJECT_ROUTING.ORIGIN);
    const cpsManager = startServices.cps!.cpsManager!;

    render(
      <TestProviders startServices={startServices}>
        <CpsMlRuleCallout />
      </TestProviders>
    );

    await waitFor(() => {
      expect(cpsManager.whenReady).toHaveBeenCalled();
    });
    expect(screen.queryByTestId('callout-cps-ml-rule')).not.toBeInTheDocument();
  });
});
