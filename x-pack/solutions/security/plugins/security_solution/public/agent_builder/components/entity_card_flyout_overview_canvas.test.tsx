/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { EntityForAttachment } from '../attachment_types/entity_attachment/use_entity_for_attachment';
import { useEntityForAttachment } from '../attachment_types/entity_attachment/use_entity_for_attachment';
import { EntityType } from '../../../common/entity_analytics/types';
import { EntityCardFlyoutOverviewCanvas } from './entity_card_flyout_overview_canvas';

/**
 * The canvas component is a thin dispatcher:
 *   - `isLoading && !data`  → <FlyoutLoading />
 *   - identifierType === 'generic' → null
 *   - identifierType ∈ {host,user,service} → <HostEntityFlyoutOverviewCanvas | UserEntity... | ServiceEntity...>
 *
 * The sub-canvases transitively require the in-app Security providers (Redux, sourcerer,
 * `useGlobalTime`, `useRiskScore`, entity-store hooks, …); mounting them here would require
 * reproducing the entire Security runtime. Those branches are already covered by the flyout's
 * own test suite. This file focuses on the dispatch-level branches: loading and `generic → null`.
 */

jest.mock('../attachment_types/entity_attachment/use_entity_for_attachment', () => ({
  useEntityForAttachment: jest.fn(),
}));

jest.mock('../../flyout/shared/components/flyout_loading', () => ({
  FlyoutLoading: () => <div data-test-subj="flyoutLoadingMock" />,
}));

const mockedUseEntityForAttachment = useEntityForAttachment as jest.Mock;

const baseEntityData = (override: Partial<EntityForAttachment> = {}): EntityForAttachment => ({
  entityType: EntityType.host,
  displayName: 'host-1',
  entityId: 'entity-id',
  isEntityInStore: true,
  firstSeen: null,
  lastSeen: null,
  timestamp: null,
  watchlistIds: [],
  sources: [],
  ...override,
});

const applicationStub = { navigateToApp: jest.fn() } as unknown as ApplicationStart;

const renderCanvas = (identifier: {
  identifierType: 'host' | 'user' | 'service' | 'generic';
  identifier: string;
}) =>
  render(
    <I18nProvider>
      <EntityCardFlyoutOverviewCanvas identifier={identifier} application={applicationStub} />
    </I18nProvider>
  );

describe('EntityCardFlyoutOverviewCanvas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows FlyoutLoading while useEntityForAttachment is loading and has no data yet', () => {
    mockedUseEntityForAttachment.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });

    renderCanvas({ identifierType: 'host', identifier: 'host-1' });
    expect(screen.getByTestId('flyoutLoadingMock')).toBeInTheDocument();
  });

  it('returns null for generic entity types (Security flyout only supports host/user/service)', () => {
    mockedUseEntityForAttachment.mockReturnValue({
      data: baseEntityData({ entityType: EntityType.generic }),
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    const { container } = renderCanvas({
      identifierType: 'generic',
      identifier: 'some-resource',
    });
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('flyoutLoadingMock')).not.toBeInTheDocument();
  });
});
