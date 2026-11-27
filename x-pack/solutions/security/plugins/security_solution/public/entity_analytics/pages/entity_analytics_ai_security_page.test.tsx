/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TestProviders } from '../../common/mock';
import { useAiAgentsInventory } from '../components/ai_security/hooks/use_ai_agents';
import {
  mockInventoryRow as row,
  mockPerson,
} from '../components/ai_security/components/test_utils';
import { EntityAnalyticsAiSecurityPage } from './entity_analytics_ai_security_page';

jest.mock('@kbn/charts-theme', () => ({ useElasticChartsTheme: () => ({}) }));
jest.mock('@elastic/charts', () => ({
  Chart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Settings: () => null,
  Axis: () => null,
  AreaSeries: () => null,
  Position: { Left: 'left' },
  ScaleType: { Linear: 'linear' },
  CurveType: { CURVE_STEP: 'curveStep' },
}));
jest.mock('../../common/hooks/use_space_id', () => ({ useSpaceId: () => 'gen-demo' }));
jest.mock('../components/ai_security/hooks/use_ai_agents', () => ({
  useAiAgentsInventory: jest.fn(),
}));
jest.mock('../../flyout_v2/use_flyout_api', () => ({
  useFlyoutApi: () => ({ openAiAgentFlyout: jest.fn() }),
}));
jest.mock('../api/hooks/use_get_watchlists', () => ({
  useGetWatchlists: () => ({ data: [] }),
}));
jest.mock('../components/ai_security/components/hunt_ai_agents_button', () => ({
  HuntAiAgentsButton: () => null,
}));
jest.mock('../components/ai_security/components/unsanctioned_setup_callout', () => ({
  UnsanctionedSetupCallout: () => null,
}));

const UNSANCTIONED_ID = 'unsanctioned-ai-agents-watchlist-id-gen-demo';
const avery = mockPerson({
  entityId: 'user:avery@okta',
  name: 'Avery Quinn',
  emails: ['avery@example.com'],
});

const rows = [
  row({
    entityId: 'unsanctioned-install',
    hostId: 'laptop',
    watchlistIds: [UNSANCTIONED_ID],
    accounts: [{ emails: ['kim@personal.example'] }],
  }),
  row({
    entityId: 'avery-install',
    hostId: 'runner',
    accounts: [{ person: avery, emails: ['avery@example.com'] }],
  }),
];

const renderPage = () =>
  render(
    <TestProviders>
      <MemoryRouter>
        <EntityAnalyticsAiSecurityPage />
      </MemoryRouter>
    </TestProviders>
  );

const shownRowIds = () =>
  screen
    .getAllByTestId(/^aiAgentsTableRow-/)
    .map((element) => element.getAttribute('data-test-subj'));

describe('EntityAnalyticsAiSecurityPage', () => {
  beforeEach(() => {
    (useAiAgentsInventory as jest.Mock).mockReturnValue({
      data: { rows, alertsUnavailable: false },
      isLoading: false,
      isError: false,
      dataUpdatedAt: new Date('2026-11-27T12:00:00.000Z').getTime(),
    });
  });

  it('filters the table from a tile, and clears the filter on a second click', () => {
    renderPage();
    expect(shownRowIds()).toHaveLength(2);
    const tile = screen.getByTestId('eaFaceliftSignalCard-unsanctioned');
    fireEvent.click(tile);
    expect(shownRowIds()).toEqual(['aiAgentsTableRow-unsanctioned-install']);
    expect(screen.getByTestId('aiSecurityInstallsShown')).toHaveTextContent('Showing 1 of 2');
    fireEvent.click(tile);
    expect(shownRowIds()).toHaveLength(2);
  });

  it("finds an install by the person's name", () => {
    renderPage();
    fireEvent.change(screen.getByTestId('aiSecuritySearch'), { target: { value: 'avery' } });
    expect(shownRowIds()).toEqual(['aiAgentsTableRow-avery-install']);
  });

  it('groups the installs by person from the Group by selector', () => {
    renderPage();
    fireEvent.click(screen.getByTestId('group-selector-dropdown'));
    fireEvent.click(screen.getByTestId('panel-person'));
    const groups = screen.getByTestId('aiAgentsGroups');
    expect(within(groups).getByTestId('aiAgentsGroup-person:user:avery@okta')).toHaveTextContent(
      'Avery Quinn'
    );
    expect(
      within(groups).getByTestId('aiAgentsGroup-email:kim@personal.example')
    ).toHaveTextContent('No matching person');
  });
});
