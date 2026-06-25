/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { ISessionService } from '@kbn/data-plugin/public';
import {
  navigateToEntityAnalyticsHomePageInApp,
  navigateToEntityAnalyticsWithFlyoutInApp,
} from './entity_explore_navigation';
import { EntityAnalyticsAgentNavigationProvider } from './entity_analytics_agent_navigation_context';
import { EntityListTable, type EntityListRow } from './entity_list_table';

jest.mock('./entity_explore_navigation', () => {
  const actual = jest.requireActual('./entity_explore_navigation');
  return {
    ...actual,
    navigateToEntityAnalyticsWithFlyoutInApp: jest.fn(),
    navigateToEntityAnalyticsHomePageInApp: jest.fn(),
  };
});

// `RiskScoreLevel` relies on a full EuiThemeProvider for styled-emotion tokens
// that are not wired up in this focused test. Mocked so rendering the Risk
// level column doesn't pull the whole EUI theme setup into every test case.
jest.mock('../../entity_analytics/components/severity/common', () => ({
  RiskScoreLevel: ({ severity }: { severity?: string }) => (
    <span data-test-subj="riskScoreLevelMock">{severity}</span>
  ),
}));

// `FormattedRelativePreferenceDate` pulls in Kibana UI settings and the shared
// date-formatting infrastructure. We only care about the Name column here, so
// stub it with a trivial renderer.
jest.mock('../../common/components/formatted_date', () => ({
  FormattedRelativePreferenceDate: ({ value }: { value?: string }) => (
    <span data-test-subj="formattedRelativePreferenceDateMock">{value}</span>
  ),
}));

const mockedNavigateToFlyout = navigateToEntityAnalyticsWithFlyoutInApp as jest.Mock;
const mockedNavigateToHome = navigateToEntityAnalyticsHomePageInApp as jest.Mock;

const buildApplication = (): ApplicationStart =>
  ({ navigateToApp: jest.fn() } as unknown as ApplicationStart);

const renderTable = (
  rows: EntityListRow[],
  extraProps: { searchSession?: ISessionService; closeCanvas?: () => void } = {}
) => {
  const application = buildApplication();
  const { searchSession, closeCanvas } = extraProps;
  render(
    <I18nProvider>
      <EntityAnalyticsAgentNavigationProvider
        application={application}
        searchSession={searchSession}
      >
        <EntityListTable entities={rows} closeCanvas={closeCanvas} />
      </EntityAnalyticsAgentNavigationProvider>
    </I18nProvider>
  );
  return { application };
};

describe('EntityListTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders one row per entity with its display name', () => {
    renderTable([
      { entity_type: 'host', entity_id: 'host:web-01@default', entity_name: 'web-01' },
      { entity_type: 'user', entity_id: 'user:bob@default', entity_name: 'bob' },
    ]);

    expect(screen.getByText('web-01')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
  });

  describe('Name-column Open entity in Entity Analytics button', () => {
    it('opens the flyout with the HostPanelKey payload for host rows with an entity id', () => {
      const { application } = renderTable([
        {
          entity_type: 'host',
          entity_id: 'host:web-01@default',
          entity_name: 'web-01',
        },
      ]);

      fireEvent.click(screen.getByLabelText('Open entity in Entity Analytics'));

      expect(mockedNavigateToFlyout).toHaveBeenCalledTimes(1);
      expect(mockedNavigateToHome).not.toHaveBeenCalled();
      const args = mockedNavigateToFlyout.mock.calls[0][0];
      expect(args.application).toBe(application);
      expect(args.flyout).toEqual({
        preview: [],
        right: {
          id: 'host-panel',
          params: {
            contextID: 'agent-builder-entity-card',
            scopeId: 'agent-builder-entity-card',
            hostName: 'web-01',
            entityId: 'host:web-01@default',
          },
        },
      });
    });

    it('opens the flyout with the UserPanelKey payload for user rows with an entity id', () => {
      renderTable([
        {
          entity_type: 'user',
          entity_id: 'user:bob@default',
          entity_name: 'bob',
        },
      ]);

      fireEvent.click(screen.getByLabelText('Open entity in Entity Analytics'));

      expect(mockedNavigateToFlyout).toHaveBeenCalledTimes(1);
      expect(mockedNavigateToFlyout.mock.calls[0][0].flyout.right).toEqual({
        id: 'user-panel',
        params: {
          contextID: 'agent-builder-entity-card',
          scopeId: 'agent-builder-entity-card',
          userName: 'bob',
          identityFields: { 'user.name': 'bob' },
          entityId: 'user:bob@default',
        },
      });
    });

    it('opens the flyout with the ServicePanelKey payload for service rows with an entity id', () => {
      renderTable([
        {
          entity_type: 'service',
          entity_id: 'service:auth-svc@default',
          entity_name: 'auth-svc',
        },
      ]);

      fireEvent.click(screen.getByLabelText('Open entity in Entity Analytics'));

      expect(mockedNavigateToFlyout).toHaveBeenCalledTimes(1);
      expect(mockedNavigateToFlyout.mock.calls[0][0].flyout.right).toEqual({
        id: 'service-panel',
        params: {
          contextID: 'agent-builder-entity-card',
          scopeId: 'agent-builder-entity-card',
          serviceName: 'auth-svc',
          entityId: 'service:auth-svc@default',
        },
      });
    });

    it('falls back to the entity_id for the display name when entity_name is missing', () => {
      renderTable([
        {
          entity_type: 'host',
          entity_id: 'host:no-name@default',
        },
      ]);

      fireEvent.click(screen.getByLabelText('Open entity in Entity Analytics'));

      expect(mockedNavigateToFlyout).toHaveBeenCalledTimes(1);
      expect(mockedNavigateToFlyout.mock.calls[0][0].flyout.right.params).toMatchObject({
        hostName: 'host:no-name@default',
        entityId: 'host:no-name@default',
      });
    });

    it('falls back to the unfiltered Entity Analytics home for generic entities (no dedicated flyout)', () => {
      const { application } = renderTable([
        {
          entity_type: 'generic',
          entity_id: 'generic:some-id@default',
          entity_name: 'some-id',
        },
      ]);

      fireEvent.click(screen.getByLabelText('Open entity in Entity Analytics'));

      expect(mockedNavigateToHome).toHaveBeenCalledTimes(1);
      expect(mockedNavigateToFlyout).not.toHaveBeenCalled();
      expect(mockedNavigateToHome.mock.calls[0][0].application).toBe(application);
    });

    it('forwards searchSession to the flyout helper', () => {
      const searchSession = { clear: jest.fn() } as unknown as ISessionService;

      renderTable(
        [
          {
            entity_type: 'host',
            entity_id: 'host:web-01@default',
            entity_name: 'web-01',
          },
        ],
        { searchSession }
      );

      fireEvent.click(screen.getByLabelText('Open entity in Entity Analytics'));

      expect(mockedNavigateToFlyout).toHaveBeenCalledTimes(1);
      expect(mockedNavigateToFlyout.mock.calls[0][0].searchSession).toBe(searchSession);
    });

    it('forwards searchSession to the home fallback helper', () => {
      const searchSession = { clear: jest.fn() } as unknown as ISessionService;

      renderTable(
        [
          {
            entity_type: 'generic',
            entity_id: 'generic:some-id@default',
            entity_name: 'some-id',
          },
        ],
        { searchSession }
      );

      fireEvent.click(screen.getByLabelText('Open entity in Entity Analytics'));

      expect(mockedNavigateToHome).toHaveBeenCalledTimes(1);
      expect(mockedNavigateToHome.mock.calls[0][0].searchSession).toBe(searchSession);
    });

    it('closes the canvas before navigating to the Entity Analytics flyout so it is not overlaid by the canvas', () => {
      const closeCanvas = jest.fn();
      let navigateCallOrder = -1;
      mockedNavigateToFlyout.mockImplementation(() => {
        navigateCallOrder = closeCanvas.mock.invocationCallOrder[0] ?? -1;
      });

      renderTable(
        [
          {
            entity_type: 'host',
            entity_id: 'host:web-01@default',
            entity_name: 'web-01',
          },
        ],
        { closeCanvas }
      );

      fireEvent.click(screen.getByLabelText('Open entity in Entity Analytics'));

      expect(closeCanvas).toHaveBeenCalledTimes(1);
      expect(mockedNavigateToFlyout).toHaveBeenCalledTimes(1);
      expect(navigateCallOrder).toBeGreaterThan(-1);
      expect(closeCanvas.mock.invocationCallOrder[0]).toBeLessThan(
        mockedNavigateToFlyout.mock.invocationCallOrder[0]
      );
    });

    it('closes the canvas before falling back to the Entity Analytics home page for generic entities', () => {
      const closeCanvas = jest.fn();

      renderTable(
        [
          {
            entity_type: 'generic',
            entity_id: 'generic:some-id@default',
            entity_name: 'some-id',
          },
        ],
        { closeCanvas }
      );

      fireEvent.click(screen.getByLabelText('Open entity in Entity Analytics'));

      expect(closeCanvas).toHaveBeenCalledTimes(1);
      expect(mockedNavigateToHome).toHaveBeenCalledTimes(1);
      expect(closeCanvas.mock.invocationCallOrder[0]).toBeLessThan(
        mockedNavigateToHome.mock.invocationCallOrder[0]
      );
    });

    it('is a no-op when closeCanvas is not provided (inline table usage)', () => {
      renderTable([
        {
          entity_type: 'host',
          entity_id: 'host:web-01@default',
          entity_name: 'web-01',
        },
      ]);

      expect(() => {
        fireEvent.click(screen.getByLabelText('Open entity in Entity Analytics'));
      }).not.toThrow();
      expect(mockedNavigateToFlyout).toHaveBeenCalledTimes(1);
    });
  });
});
