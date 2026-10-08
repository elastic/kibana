/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { openImpactEntityFlyout } from './open_impact_entity_flyout';

jest.mock('../components/security_redux_embedded_provider', () => ({
  SecurityReduxEmbeddedProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../components/entity_card_flyout_overview_canvas', () => ({
  EntityCardFlyoutOverviewCanvas: () => <div data-test-subj="entityOverview" />,
}));

jest.mock('./entity_attachment/query_client', () => ({
  entityAttachmentQueryClient: {},
}));

describe('openImpactEntityFlyout', () => {
  const overlays = { openFlyoutTemplate: jest.fn() };
  const resolveSecurityCanvasContext = jest.fn();

  beforeEach(() => {
    overlays.openFlyoutTemplate.mockReset();
  });

  it('opens the entity overview as a child flyout on the current page', () => {
    openImpactEntityFlyout({
      entity: { id: 'user:cfo@corp', name: 'cfo@corp', type: 'user' },
      overlays,
      resolveSecurityCanvasContext,
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

  it('does nothing for a named entity that is not an entity-store id', () => {
    openImpactEntityFlyout({
      entity: { id: 'checkout-service', name: 'checkout-service', type: 'service' },
      overlays,
      resolveSecurityCanvasContext,
    });

    expect(overlays.openFlyoutTemplate).not.toHaveBeenCalled();
  });

  it('does nothing when the entity has no flyout type', () => {
    openImpactEntityFlyout({
      entity: { id: 'generic-1', type: 'generic' },
      overlays,
      resolveSecurityCanvasContext,
    });

    expect(overlays.openFlyoutTemplate).not.toHaveBeenCalled();
  });
});
