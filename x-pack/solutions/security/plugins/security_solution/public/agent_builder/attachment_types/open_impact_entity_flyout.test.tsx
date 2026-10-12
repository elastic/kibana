/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ApplicationStart } from '@kbn/core-application-browser';
import { useEntityAnalyticsAgentNavigation } from './entity_analytics_agent_navigation_context';
import { openImpactEntityFlyout } from './open_impact_entity_flyout';

jest.mock('@kbn/react-query', () => ({
  ...jest.requireActual('@kbn/react-query'),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@kbn/flyout-template', () => {
  const Passthrough = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  Passthrough.displayName = 'Passthrough';
  return { FlyoutTemplate: Object.assign(Passthrough, { Body: Passthrough }) };
});

jest.mock('../components/security_redux_embedded_provider', () => ({
  SecurityReduxEmbeddedProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../components/entity_card_flyout_overview_canvas', () => ({
  EntityCardFlyoutOverviewCanvas: ({ identifier }: { identifier: unknown }) => {
    const { canNavigate } = useEntityAnalyticsAgentNavigation();
    return (
      <div data-test-subj="entityOverview" data-identifier={JSON.stringify(identifier)}>
        {canNavigate ? 'can-navigate' : 'no-nav'}
      </div>
    );
  },
}));

jest.mock('./entity_attachment/query_client', () => ({
  entityAttachmentQueryClient: {},
}));

describe('openImpactEntityFlyout', () => {
  const overlays = { openFlyoutTemplate: jest.fn() };
  const resolveSecurityCanvasContext = jest.fn();
  const application = {} as ApplicationStart;
  const base = { overlays, application, isNewFlyoutEnabled: true, resolveSecurityCanvasContext };

  beforeEach(() => {
    overlays.openFlyoutTemplate.mockReset();
  });

  it('opens the entity overview as a child flyout on the current page', () => {
    openImpactEntityFlyout({
      entity: { id: 'user:cfo@corp', name: 'cfo@corp', type: 'user' },
      ...base,
    });

    expect(overlays.openFlyoutTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        session: 'inherit',
        flyoutMenuProps: { title: 'cfo@corp' },
        id: 'securityImpactEntityFlyout',
      }),
      expect.any(Function)
    );
  });

  it('provides the navigation context so entity detail links can navigate', () => {
    openImpactEntityFlyout({
      entity: { id: 'user:cfo@corp', name: 'cfo@corp', type: 'user' },
      ...base,
    });

    const Content = overlays.openFlyoutTemplate.mock.calls[0][1];
    render(<Content onClose={jest.fn()} />);

    expect(screen.getByTestId('entityOverview')).toHaveTextContent('can-navigate');
  });

  it('resolves an entity-store id directly', () => {
    openImpactEntityFlyout({
      entity: { id: 'user:cfo@corp', name: 'cfo@corp', type: 'user' },
      ...base,
    });

    const Content = overlays.openFlyoutTemplate.mock.calls[0][1];
    render(<Content onClose={jest.fn()} />);

    expect(JSON.parse(screen.getByTestId('entityOverview').dataset.identifier ?? '')).toEqual({
      identifierType: 'user',
      identifier: 'cfo@corp',
      entityStoreId: 'user:cfo@corp',
    });
  });

  it('resolves a named host, user, or service through its type, without an entity-store id', () => {
    openImpactEntityFlyout({
      entity: { id: 'ws-finance-04', name: 'ws-finance-04', type: 'host' },
      ...base,
    });

    expect(overlays.openFlyoutTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ flyoutMenuProps: { title: 'ws-finance-04' } }),
      expect.any(Function)
    );

    const Content = overlays.openFlyoutTemplate.mock.calls[0][1];
    render(<Content onClose={jest.fn()} />);

    expect(JSON.parse(screen.getByTestId('entityOverview').dataset.identifier ?? '')).toEqual({
      identifierType: 'host',
      identifier: 'ws-finance-04',
    });
  });

  it('does nothing when the entity has no flyout type', () => {
    openImpactEntityFlyout({
      entity: { id: 'generic-1', type: 'generic' },
      ...base,
    });

    expect(overlays.openFlyoutTemplate).not.toHaveBeenCalled();
  });
});
