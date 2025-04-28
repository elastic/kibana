/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import IntegrationsCard from './integrations_card';
import { render } from '@testing-library/react';

jest.mock('../../../onboarding_context');
jest.mock('../../../../../common/lib/integrations/components');
const props = {
  setComplete: jest.fn(),
  checkComplete: jest.fn(),
  setExpandedCardId: jest.fn(),
  isCardAvailable: jest.fn(),
  isCardComplete: jest.fn(),
};

describe('IntegrationsCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
        checkCompleteMetadata={{ installedIntegrationsCount: 1, isAgentRequired: false }}
      />
    );
    expect(queryByTestId('loadingInstalledIntegrations')).not.toBeInTheDocument();
    expect(queryByTestId('securityIntegrations')).toBeInTheDocument();
  });
});
