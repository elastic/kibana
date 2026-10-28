/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { Capabilities } from '@kbn/core/public';
import { TestProviders, kibanaMock } from '../../common/mock';
import type { StartServices } from '../../types';
import { EntityStoreDisabledEmptyPromptBody } from './entity_store_disabled_empty_prompt';

jest.mock('../../common/components/links/link_props', () => {
  const mockReact = jest.requireActual<typeof React>('react');
  return {
    withSecuritySolutionLink:
      (WrappedComponent: React.ComponentType<Record<string, unknown>>) =>
      (props: Record<string, unknown>) =>
        mockReact.createElement(WrappedComponent, { ...props, href: '/mocked' }),
    useGetSecuritySolutionLinkProps: jest.fn(() => () => ({ href: '/mocked', onClick: jest.fn() })),
    useSecuritySolutionLinkProps: jest.fn(() => ({ href: '/mocked', onClick: jest.fn() })),
  };
});

jest.mock('../../common/components/link_to', () => ({
  useGetSecuritySolutionUrl:
    () =>
    ({ deepLinkId, path = '' }: { deepLinkId: string; path?: string }) =>
      `/app/security/${deepLinkId}${path}`,
}));

const ADD_INTEGRATIONS_TEST_ID = 'entityStoreDisabledEmptyPromptAddIntegrations';

const renderWithCapabilities = (capabilities: Capabilities) => {
  const startServices: StartServices = {
    ...kibanaMock,
    application: { ...kibanaMock.application, capabilities },
  };

  return render(
    <TestProviders startServices={startServices}>
      <EntityStoreDisabledEmptyPromptBody />
    </TestProviders>
  );
};

const capabilitiesWithoutFleet = (): Capabilities =>
  Object.fromEntries(
    Object.entries(kibanaMock.application.capabilities).filter(
      ([featureId]) => featureId !== 'fleet'
    )
  ) as Capabilities;

describe('EntityStoreDisabledEmptyPromptBody', () => {
  beforeEach(() => {
    jest
      .mocked(kibanaMock.application.getUrlForApp)
      .mockImplementation((appId, options) => `/app/${appId}${options?.path ?? ''}`);
  });

  it('renders the "Add integrations" button when the user can read Integrations', () => {
    renderWithCapabilities({
      ...kibanaMock.application.capabilities,
      fleet: { read: true },
    });

    expect(screen.getByRole('link', { name: 'Enable Entity analytics' })).toBeInTheDocument();
    expect(screen.getByTestId(ADD_INTEGRATIONS_TEST_ID)).toHaveAttribute(
      'href',
      expect.stringContaining('/app/integrations/browse/advanced_analytics_ueba')
    );
  });

  it('hides the "Add integrations" button when the user cannot read Integrations', () => {
    renderWithCapabilities({
      ...kibanaMock.application.capabilities,
      fleet: { read: false },
    });

    expect(screen.getByRole('link', { name: 'Enable Entity analytics' })).toBeInTheDocument();
    expect(screen.queryByTestId(ADD_INTEGRATIONS_TEST_ID)).not.toBeInTheDocument();
  });

  it('hides the "Add integrations" button when the fleet capability is missing', () => {
    renderWithCapabilities(capabilitiesWithoutFleet());

    expect(screen.getByRole('link', { name: 'Enable Entity analytics' })).toBeInTheDocument();
    expect(screen.queryByTestId(ADD_INTEGRATIONS_TEST_ID)).not.toBeInTheDocument();
  });
});
