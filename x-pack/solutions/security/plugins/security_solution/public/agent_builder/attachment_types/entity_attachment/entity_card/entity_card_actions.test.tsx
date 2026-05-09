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
import { APP_UI_ID } from '../../../../../common/constants';
import type { EntityAttachmentIdentifier } from '../types';
import {
  navigateToEntityAnalyticsHomePageInApp,
  navigateToEntityAnalyticsWithFlyoutInApp,
} from '../../entity_explore_navigation';
import { EntityCardActions } from './entity_card_actions';

jest.mock('../../entity_explore_navigation', () => {
  const actual = jest.requireActual('../../entity_explore_navigation');
  return {
    ...actual,
    navigateToEntityAnalyticsHomePageInApp: jest.fn(),
    navigateToEntityAnalyticsWithFlyoutInApp: jest.fn(),
  };
});

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: { application: { navigateToApp: jest.fn() } },
  }),
}));

const mockedNavigateToHome = navigateToEntityAnalyticsHomePageInApp as jest.Mock;
const mockedNavigateToFlyout = navigateToEntityAnalyticsWithFlyoutInApp as jest.Mock;

const buildApplicationMock = (): ApplicationStart =>
  ({ navigateToApp: jest.fn() } as unknown as ApplicationStart);

const renderActions = (
  identifier: EntityAttachmentIdentifier,
  extraProps: Partial<React.ComponentProps<typeof EntityCardActions>> = {}
) => {
  const application = extraProps.application ?? buildApplicationMock();
  const utils = render(
    <I18nProvider>
      <EntityCardActions identifier={identifier} application={application} {...extraProps} />
    </I18nProvider>
  );
  return { ...utils, application };
};

const clickOpen = () => {
  fireEvent.click(screen.getByTestId('entityAttachmentOpenEntityAnalyticsAction'));
};

describe('EntityCardActions', () => {
  beforeEach(() => {
    mockedNavigateToHome.mockReset();
    mockedNavigateToFlyout.mockReset();
  });

  describe('host/user/service with entityStoreId', () => {
    it('opens the user flyout with the UserPanelKey payload', () => {
      const { application } = renderActions({
        identifierType: 'user',
        identifier: 'bob',
        entityStoreId: 'user:bob@acme@default',
      });

      expect(screen.getByText('Open in Entity Analytics')).toBeInTheDocument();

      clickOpen();

      expect(mockedNavigateToFlyout).toHaveBeenCalledTimes(1);
      expect(mockedNavigateToHome).not.toHaveBeenCalled();
      expect(mockedNavigateToFlyout).toHaveBeenCalledWith(
        expect.objectContaining({
          application,
          appId: APP_UI_ID,
          flyout: expect.objectContaining({
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
          }),
        })
      );
    });

    it('opens the host flyout with the HostPanelKey payload', () => {
      renderActions({
        identifierType: 'host',
        identifier: 'macbook-01',
        entityStoreId: 'host:macbook-01@default',
      });

      clickOpen();

      expect(mockedNavigateToFlyout).toHaveBeenCalledTimes(1);
      expect(mockedNavigateToHome).not.toHaveBeenCalled();
      expect(mockedNavigateToFlyout).toHaveBeenCalledWith(
        expect.objectContaining({
          flyout: expect.objectContaining({
            right: {
              id: 'host-panel',
              params: {
                contextID: 'agent-builder-entity-card',
                scopeId: 'agent-builder-entity-card',
                hostName: 'macbook-01',
                entityId: 'host:macbook-01@default',
              },
            },
          }),
        })
      );
    });

    it('opens the service flyout with the ServicePanelKey payload', () => {
      renderActions({
        identifierType: 'service',
        identifier: 'auth-svc',
        entityStoreId: 'service:auth-svc@default',
      });

      clickOpen();

      expect(mockedNavigateToFlyout).toHaveBeenCalledTimes(1);
      expect(mockedNavigateToHome).not.toHaveBeenCalled();
      expect(mockedNavigateToFlyout).toHaveBeenCalledWith(
        expect.objectContaining({
          flyout: expect.objectContaining({
            right: {
              id: 'service-panel',
              params: {
                contextID: 'agent-builder-entity-card',
                scopeId: 'agent-builder-entity-card',
                serviceName: 'auth-svc',
                entityId: 'service:auth-svc@default',
              },
            },
          }),
        })
      );
    });

    it('forwards the optional searchSession so the helper can clear it before navigating', () => {
      const searchSession = { clear: jest.fn() };

      renderActions(
        {
          identifierType: 'user',
          identifier: 'bob',
          entityStoreId: 'user:bob@acme@default',
        },
        { searchSession: searchSession as never }
      );

      clickOpen();

      expect(mockedNavigateToFlyout).toHaveBeenCalledWith(
        expect.objectContaining({ searchSession })
      );
    });
  });

  describe('generic / legacy / fallback', () => {
    it('falls back to the unfiltered home navigation for generic entities', () => {
      const { application } = renderActions({
        identifierType: 'generic',
        identifier: 'some-generic-id',
        entityStoreId: 'generic:some-generic-id@default',
      });

      expect(screen.getByText('Open Entity Analytics')).toBeInTheDocument();

      clickOpen();

      expect(mockedNavigateToHome).toHaveBeenCalledTimes(1);
      expect(mockedNavigateToFlyout).not.toHaveBeenCalled();
      expect(mockedNavigateToHome).toHaveBeenCalledWith(
        expect.objectContaining({ application, appId: APP_UI_ID })
      );
    });

    it.each(['user', 'host', 'service'] as const)(
      'falls back to the unfiltered home navigation when a %s attachment has no entityStoreId (legacy payload)',
      (identifierType) => {
        renderActions({ identifierType, identifier: 'anything' });

        expect(screen.getByText('Open Entity Analytics')).toBeInTheDocument();

        clickOpen();

        expect(mockedNavigateToHome).toHaveBeenCalledTimes(1);
        expect(mockedNavigateToFlyout).not.toHaveBeenCalled();
      }
    );
  });

  it('renders with "Open in Entity Analytics" label for flyout-capable entities', () => {
    renderActions({
      identifierType: 'user',
      identifier: 'bob',
      entityStoreId: 'user:bob@acme@default',
    });
    expect(screen.getByText('Open in Entity Analytics')).toBeInTheDocument();
    expect(screen.queryByText('Open Entity Analytics')).not.toBeInTheDocument();
  });

  it('renders with "Open Entity Analytics" label for generic entities', () => {
    renderActions({
      identifierType: 'generic',
      identifier: 'some-id',
    });
    expect(screen.getByText('Open Entity Analytics')).toBeInTheDocument();
    expect(screen.queryByText('Open in Entity Analytics')).not.toBeInTheDocument();
  });
});
