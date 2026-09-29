/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { ActiveIntegrationsCallout } from './active_integrations_callout';
vi.mock('./agent_required_callout');
vi.mock('./manage_integrations_callout');

describe('ActiveIntegrationsCallout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the callout and available packages when integrations are installed', () => {
    const mockMetadata = {
      activeIntegrationsCount: 3,
      isAgentRequired: false,
    };

    const { getByTestId } = render(<ActiveIntegrationsCallout {...mockMetadata} />);

    expect(getByTestId('manageIntegrationsCallout')).toBeInTheDocument();
  });

  it('renders the warning callout when an agent is still required', () => {
    const mockMetadata = {
      activeIntegrationsCount: 2,
      isAgentRequired: true,
    };

    const { getByTestId } = render(<ActiveIntegrationsCallout {...mockMetadata} />);

    expect(getByTestId('agentRequiredCallout')).toBeInTheDocument();
  });
});
