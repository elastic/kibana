/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import IntegrationsCard from './integrations_card';
import { render } from '@testing-library/react';
vi.mock('../../../onboarding_context');

vi.mock('../../../../../common/lib/integrations/components/security_integrations_grid_tabs');
vi.mock('../../../../../common/lib/integrations/components/with_available_packages');

const props = {
  setComplete: vi.fn(),
  checkComplete: vi.fn(),
  isCardComplete: vi.fn(),
  setExpandedCardId: vi.fn(),
  isCardAvailable: vi.fn(),
};

describe('IntegrationsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a loading spinner when checkCompleteMetadata is undefined', () => {
    const { getByTestId } = render(
      <IntegrationsCard {...props} checkCompleteMetadata={undefined} />
    );
    expect(getByTestId('loadingInstalledIntegrations')).toBeInTheDocument();
  });

  it('renders the content', () => {
    const { queryByTestId } = render(
      <IntegrationsCard
        {...props}
        checkCompleteMetadata={{
          activeIntegrations: [
            {
              name: 'test',
              version: '1.0.0',
              status: 'installed',
              dataStreams: [{ name: 'test-data-stream', title: 'test' }],
            },
          ],
        }}
      />
    );
    expect(queryByTestId('loadingInstalledIntegrations')).not.toBeInTheDocument();
    expect(queryByTestId('withAvailablePackages')).toBeInTheDocument();
  });
});
