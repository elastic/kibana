/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from '@kbn/shared-ux-router';
import { ConfigurationsTabs } from './configuration_tabs';
import { useNavigation } from '../../common/lib/kibana';
import { TestProviders } from '../../common/mock';
import { ConfigurationTabs } from '../constants';
import { useAgentBuilderAvailability } from '../../agent_builder/hooks/use_agent_builder_availability';

jest.mock('../../common/lib/kibana');
jest.mock('../../agent_builder/hooks/use_agent_builder_availability');

const mockNavigateTo = jest.fn();

describe('ConfigurationsTabs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      navigateTo: mockNavigateTo,
    });
    (useAgentBuilderAvailability as jest.Mock).mockReturnValue({
      isAgentChatExperienceEnabled: false,
    });
  });

  it('renders all tabs including AI Settings when isAgentChatExperienceEnabled is false', () => {
    const { getByText } = render(
      <MemoryRouter initialEntries={[`/configurations/${ConfigurationTabs.integrations}`]}>
        <TestProviders>
          <ConfigurationsTabs />
        </TestProviders>
      </MemoryRouter>
    );

    expect(getByText('Integrations')).toBeInTheDocument();
    expect(getByText('Rules')).toBeInTheDocument();
    expect(getByText('AI settings')).toBeInTheDocument();
  });

  it('does not render AI Settings tab when isAgentChatExperienceEnabled is true', () => {
    (useAgentBuilderAvailability as jest.Mock).mockReturnValue({
      isAgentChatExperienceEnabled: true,
    });

    const { getByText, queryByText } = render(
      <MemoryRouter initialEntries={[`/configurations/${ConfigurationTabs.integrations}`]}>
        <TestProviders>
          <ConfigurationsTabs />
        </TestProviders>
      </MemoryRouter>
    );

    expect(getByText('Integrations')).toBeInTheDocument();
    expect(getByText('Rules')).toBeInTheDocument();
    expect(queryByText('AI settings')).not.toBeInTheDocument();
  });
});
