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
  hasLinkedProjects,
  defaultProjectRouting = PROJECT_ROUTING.ALL,
}: {
  hasLinkedProjects: boolean;
  defaultProjectRouting?: string;
}): ICPSManager =>
  ({
    whenReady: jest.fn().mockResolvedValue(undefined),
    hasLinkedProjects: jest.fn().mockReturnValue(hasLinkedProjects),
    getDefaultProjectRouting: jest.fn().mockReturnValue(defaultProjectRouting),
  } as unknown as ICPSManager);

const startServicesWithLinkedProjects = (
  hasLinkedProjects: boolean,
  defaultProjectRouting: string = PROJECT_ROUTING.ALL
): StartServices => ({
  ...kibanaMock,
  cps: {
    cpsManager: createCpsManager({ hasLinkedProjects, defaultProjectRouting }),
    isTierEligible: true,
  },
});

describe('CpsMlRuleCallout', () => {
  it('renders when there are linked projects and space default routing includes them', async () => {
    render(
      <TestProviders startServices={startServicesWithLinkedProjects(true)}>
        <CpsMlRuleCallout />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('callout-cps-ml-rule')).toBeInTheDocument();
    });
  });

  it('does not render when there are no linked projects', async () => {
    const startServices = startServicesWithLinkedProjects(false);
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

  it('does not render when there are linked projects but space is limited to origin only', async () => {
    const startServices = startServicesWithLinkedProjects(true, PROJECT_ROUTING.ORIGIN);
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
