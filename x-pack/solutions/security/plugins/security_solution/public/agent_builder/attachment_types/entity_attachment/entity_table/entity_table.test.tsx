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
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { EntityType } from '../../../../../common/entity_analytics/types';
import type { EntityForAttachment } from '../use_entity_for_attachment';
import { useEntityForAttachment } from '../use_entity_for_attachment';
import {
  navigateToEntityAnalyticsHomePageInApp,
  navigateToEntityAnalyticsWithFlyoutInApp,
} from '../../entity_explore_navigation';
import { EntityTable } from './entity_table';

jest.mock('../use_entity_for_attachment', () => ({
  useEntityForAttachment: jest.fn(),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../../entity_explore_navigation', () => {
  const actual = jest.requireActual('../../entity_explore_navigation');
  return {
    ...actual,
    navigateToEntityAnalyticsWithFlyoutInApp: jest.fn(),
    navigateToEntityAnalyticsHomePageInApp: jest.fn(),
  };
});

const mockedUseEntityForAttachment = useEntityForAttachment as jest.Mock;
const mockedUseKibana = useKibana as jest.Mock;
const mockedNavigateToFlyout = navigateToEntityAnalyticsWithFlyoutInApp as jest.Mock;
const mockedNavigateToHome = navigateToEntityAnalyticsHomePageInApp as jest.Mock;

const baseEntityData = (override: Partial<EntityForAttachment> = {}): EntityForAttachment => ({
  entityType: EntityType.host,
  displayName: 'host-1',
  entityId: 'entity-id-host-1',
  isEntityInStore: true,
  firstSeen: null,
  lastSeen: '2024-01-01T00:00:00Z',
  timestamp: '2024-01-01T00:00:00Z',
  riskScore: 42,
  riskLevel: 'Low',
  watchlistIds: [],
  sources: ['endpoint.events.process'],
  ...override,
});

const renderTable = (props: Partial<React.ComponentProps<typeof EntityTable>> = {}) =>
  render(
    <I18nProvider>
      <EntityTable
        entities={[
          { identifierType: 'host', identifier: 'host-1' },
          { identifierType: 'user', identifier: 'bob' },
        ]}
        {...props}
      />
    </I18nProvider>
  );

describe('EntityTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseKibana.mockReturnValue({
      services: { application: { navigateToApp: jest.fn() } },
    });
    mockedUseEntityForAttachment.mockReturnValue({
      data: baseEntityData(),
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it('renders one row per entity with its display name', () => {
    renderTable();
    const cells = screen.getAllByTestId('entityAttachmentTableName');
    expect(cells).toHaveLength(2);
    expect(cells[0].textContent).toContain('host-1');
  });

  it('keeps the footer "Open Entity Analytics" button visible', () => {
    renderTable();
    expect(screen.getByTestId('entityAttachmentTableOpenEntityAnalytics')).toBeInTheDocument();
  });

  describe('per-row Explore button', () => {
    it('does not render when no application prop or kibana.services.application is available', () => {
      // Simulates the embedding environment where the attachment is rendered outside
      // `KibanaContextProvider`: `useKibana().services.application` is undefined and no
      // `application` prop is passed, so per-row Explore must be hidden.
      mockedUseKibana.mockReturnValue({ services: {} });
      renderTable({ entities: [{ identifierType: 'host', identifier: 'host-1' }] });
      expect(screen.queryAllByTestId('entityAttachmentTableOpenEntity')).toHaveLength(0);
    });

    it('renders when application is passed explicitly', () => {
      const application = { navigateToApp: jest.fn() } as unknown as ApplicationStart;
      renderTable({ application });
      const buttons = screen.getAllByTestId('entityAttachmentTableOpenEntity');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('opens the Entity Analytics flyout with the HostPanelKey payload for host rows', () => {
      mockedUseEntityForAttachment.mockReturnValue({
        data: baseEntityData({
          entityId: 'host:macbook-01@default',
          displayName: 'Resolved Host',
        }),
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
      const application = { navigateToApp: jest.fn() } as unknown as ApplicationStart;

      renderTable({
        entities: [{ identifierType: 'host', identifier: 'host-1' }],
        application,
      });

      fireEvent.click(screen.getAllByTestId('entityAttachmentTableOpenEntity')[0]);

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
            hostName: 'Resolved Host',
            entityId: 'host:macbook-01@default',
          },
        },
      });
    });

    it('opens the Entity Analytics flyout with the UserPanelKey payload for user rows', () => {
      mockedUseEntityForAttachment.mockReturnValue({
        data: baseEntityData({
          entityType: EntityType.user,
          entityId: 'user:bob@acme@default',
          displayName: 'bob',
        }),
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
      const application = { navigateToApp: jest.fn() } as unknown as ApplicationStart;

      renderTable({
        entities: [{ identifierType: 'user', identifier: 'bob' }],
        application,
      });

      fireEvent.click(screen.getAllByTestId('entityAttachmentTableOpenEntity')[0]);

      expect(mockedNavigateToFlyout).toHaveBeenCalledTimes(1);
      expect(mockedNavigateToFlyout.mock.calls[0][0].flyout).toEqual({
        preview: [],
        right: {
          id: 'user-panel',
          params: {
            contextID: 'agent-builder-entity-card',
            scopeId: 'agent-builder-entity-card',
            userName: 'bob',
            identityFields: { 'user.name': 'bob' },
            entityId: 'user:bob@acme@default',
          },
        },
      });
    });

    it('opens the Entity Analytics flyout with the ServicePanelKey payload for service rows', () => {
      mockedUseEntityForAttachment.mockReturnValue({
        data: baseEntityData({
          entityType: EntityType.service,
          entityId: 'service:auth-svc@default',
          displayName: 'auth-svc',
        }),
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
      const application = { navigateToApp: jest.fn() } as unknown as ApplicationStart;

      renderTable({
        entities: [{ identifierType: 'service', identifier: 'auth-svc' }],
        application,
      });

      fireEvent.click(screen.getAllByTestId('entityAttachmentTableOpenEntity')[0]);

      expect(mockedNavigateToFlyout).toHaveBeenCalledTimes(1);
      expect(mockedNavigateToFlyout.mock.calls[0][0].flyout).toEqual({
        preview: [],
        right: {
          id: 'service-panel',
          params: {
            contextID: 'agent-builder-entity-card',
            scopeId: 'agent-builder-entity-card',
            serviceName: 'auth-svc',
            entityId: 'service:auth-svc@default',
          },
        },
      });
    });

    it('forwards the searchSession prop to navigateToEntityAnalyticsWithFlyoutInApp when clicked', () => {
      const application = { navigateToApp: jest.fn() } as unknown as ApplicationStart;
      const searchSession = { clear: jest.fn() } as unknown as ISessionService;

      renderTable({
        entities: [{ identifierType: 'host', identifier: 'host-1' }],
        application,
        searchSession,
      });

      fireEvent.click(screen.getAllByTestId('entityAttachmentTableOpenEntity')[0]);

      expect(mockedNavigateToFlyout).toHaveBeenCalledTimes(1);
      expect(mockedNavigateToFlyout.mock.calls[0][0].searchSession).toBe(searchSession);
    });

    it('uses the attachment entityStoreId when useEntityForAttachment has not resolved yet', () => {
      mockedUseEntityForAttachment.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });
      const application = { navigateToApp: jest.fn() } as unknown as ApplicationStart;

      renderTable({
        entities: [{ identifierType: 'user', identifier: 'bob', entityStoreId: 'user:bob@local' }],
        application,
      });

      fireEvent.click(screen.getAllByTestId('entityAttachmentTableOpenEntity')[0]);

      expect(mockedNavigateToFlyout).toHaveBeenCalledTimes(1);
      expect(mockedNavigateToFlyout.mock.calls[0][0].flyout.right).toEqual({
        id: 'user-panel',
        params: {
          contextID: 'agent-builder-entity-card',
          scopeId: 'agent-builder-entity-card',
          userName: 'bob',
          identityFields: { 'user.name': 'bob' },
          entityId: 'user:bob@local',
        },
      });
    });

    it('falls back to the unfiltered Entity Analytics home when a flyout-capable row has no entityStoreId', () => {
      mockedUseEntityForAttachment.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
      const application = { navigateToApp: jest.fn() } as unknown as ApplicationStart;
      const searchSession = { clear: jest.fn() } as unknown as ISessionService;

      renderTable({
        entities: [{ identifierType: 'host', identifier: 'orphan-host' }],
        application,
        searchSession,
      });

      fireEvent.click(screen.getAllByTestId('entityAttachmentTableOpenEntity')[0]);

      expect(mockedNavigateToHome).toHaveBeenCalledTimes(1);
      expect(mockedNavigateToFlyout).not.toHaveBeenCalled();
      expect(mockedNavigateToHome.mock.calls[0][0].application).toBe(application);
      expect(mockedNavigateToHome.mock.calls[0][0].searchSession).toBe(searchSession);
    });

    it('falls back to the unfiltered Entity Analytics home for generic entities (no dedicated flyout)', () => {
      mockedUseEntityForAttachment.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
      const application = { navigateToApp: jest.fn() } as unknown as ApplicationStart;

      renderTable({
        entities: [
          {
            identifierType: 'generic',
            identifier: 'some-id',
            entityStoreId: 'generic:some-id@default',
          },
        ],
        application,
      });

      fireEvent.click(screen.getAllByTestId('entityAttachmentTableOpenEntity')[0]);

      expect(mockedNavigateToHome).toHaveBeenCalledTimes(1);
      expect(mockedNavigateToFlyout).not.toHaveBeenCalled();
    });
  });

  describe('duplicate entity.name with distinct entityStoreId', () => {
    // Regression: two local service accounts share `entity.name` ("okta") but
    // have distinct `entity.id`s. Keying rows by `identifier` alone caused the
    // shared `rowsByKey` slot to be overwritten by whichever fetch resolved
    // last, so every row rendered with the same entity's data. Keying off
    // `entityStoreId` (when present) keeps the rows distinct.
    it('renders each row with its own resolved data instead of clobbering the shared slot', () => {
      const storeIdA = 'user:okta@i-aaaaaaaaaaaaaaaaa@local';
      const storeIdB = 'user:okta@i-bbbbbbbbbbbbbbbbb@local';

      // Cache one stable hook result per entityStoreId so the data reference
      // does not change between re-renders. Without caching, every render
      // produces a fresh `data` object, which fires `EntityRowLoader`'s
      // `useEffect` → `setRowsByKey` loop indefinitely.
      const resultByStoreId: Record<string, ReturnType<typeof mockedUseEntityForAttachment>> = {
        [storeIdA]: {
          data: baseEntityData({
            entityType: EntityType.user,
            displayName: 'okta',
            entityId: storeIdA,
          }),
          isLoading: false,
          error: null,
          refetch: jest.fn(),
        },
        [storeIdB]: {
          data: baseEntityData({
            entityType: EntityType.user,
            displayName: 'okta',
            entityId: storeIdB,
          }),
          isLoading: false,
          error: null,
          refetch: jest.fn(),
        },
      };

      mockedUseEntityForAttachment.mockImplementation(
        (identifier: { entityStoreId?: string }) =>
          (identifier.entityStoreId && resultByStoreId[identifier.entityStoreId]) || {
            data: null,
            isLoading: false,
            error: null,
            refetch: jest.fn(),
          }
      );

      const application = { navigateToApp: jest.fn() } as unknown as ApplicationStart;

      renderTable({
        entities: [
          { identifierType: 'user', identifier: 'okta', entityStoreId: storeIdA },
          { identifierType: 'user', identifier: 'okta', entityStoreId: storeIdB },
        ],
        application,
      });

      const exploreButtons = screen.getAllByTestId('entityAttachmentTableOpenEntity');
      expect(exploreButtons).toHaveLength(2);

      fireEvent.click(exploreButtons[0]);
      fireEvent.click(exploreButtons[1]);

      expect(mockedNavigateToFlyout).toHaveBeenCalledTimes(2);
      expect(mockedNavigateToFlyout.mock.calls[0][0].flyout.right.params.entityId).toBe(storeIdA);
      expect(mockedNavigateToFlyout.mock.calls[1][0].flyout.right.params.entityId).toBe(storeIdB);
    });
  });

  describe('pagination-aware row loading', () => {
    // Regression: `EntityRowLoader` fans out one HTTP request per identifier. A
    // chat round with many entities used to fire all of them on mount because
    // the loader was rendered for `entities` (full list) rather than
    // `pagedItems` (current page slice). Only the visible page should fetch;
    // additional pages lazy-load as the user navigates.
    it('only calls useEntityForAttachment for identifiers on the current page', () => {
      const identifiers = Array.from({ length: 12 }, (_, i) => ({
        identifierType: 'host' as const,
        identifier: `host-${i}`,
      }));

      mockedUseEntityForAttachment.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      renderTable({ entities: identifiers });

      const calledIdentifiers = mockedUseEntityForAttachment.mock.calls.map(
        ([identifier]: [{ identifier: string }]) => identifier.identifier
      );
      const unique = new Set(calledIdentifiers);
      expect(unique.size).toBe(10);
      expect(unique.has('host-10')).toBe(false);
      expect(unique.has('host-11')).toBe(false);
    });
  });
});
