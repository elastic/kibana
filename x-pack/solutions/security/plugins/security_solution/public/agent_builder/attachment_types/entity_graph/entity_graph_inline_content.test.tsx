/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import { useFetchGraphData } from '@kbn/cloud-security-posture-graph/src/hooks';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import { APP_UI_ID } from '../../../../common/constants';
import { EntityDetailsLeftPanelTab } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { navigateToEntityAnalyticsWithFlyoutInApp } from '../entity_explore_navigation';
import { OPEN_FULL_GRAPH_BUTTON_TEST_ID } from './entity_graph_container';
import { EntityGraphInlineContent } from './entity_graph_inline_content';
import type { EntityGraphAttachment, EntityGraphAttachmentData } from './types';

jest.mock('@kbn/cloud-security-posture-graph/src/hooks', () => ({
  useFetchGraphData: jest.fn(),
}));

jest.mock('../../../flyout_v2/shared/components/graph_preview', () => ({
  GraphPreview: () => <div data-test-subj="mockGraphPreview" />,
}));

// Mock the shared navigation so we can capture the flyout the inline content builds.
jest.mock('../entity_explore_navigation', () => ({
  navigateToEntityAnalyticsWithFlyoutInApp: jest.fn(),
  navigateToEntityAnalyticsHomePageInApp: jest.fn(),
}));

const mockUseFetchGraphData = useFetchGraphData as jest.Mock;
const mockNavigateWithFlyout = navigateToEntityAnalyticsWithFlyoutInApp as jest.Mock;

const timeRange = { from: 'now-30d', to: 'now' };

const dataFor = (
  identifierType: EntityGraphAttachmentData['identifierType'],
  identifier: string,
  entityStoreId: string
): EntityGraphAttachmentData => ({ identifierType, identifier, entityStoreId, timeRange });

const renderInline = (data: EntityGraphAttachmentData, isNewFlyoutEnabled = false) => {
  const props = {
    attachment: {
      id: 'a',
      type: 'security.entity_graph',
      data,
    } as unknown as EntityGraphAttachment,
    isSidebar: false,
  } as AttachmentRenderProps<EntityGraphAttachment>;
  return render(
    <EntityGraphInlineContent
      {...props}
      application={{} as ApplicationStart}
      http={{} as HttpStart}
      isNewFlyoutEnabled={isNewFlyoutEnabled}
    />
  );
};

describe('EntityGraphInlineContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFetchGraphData.mockReturnValue({ isLoading: false, isError: false, data: undefined });
  });

  it('opens the host details flyout on the graph tab', () => {
    renderInline(dataFor('host', 'server1', 'host:server1'));
    fireEvent.click(screen.getByTestId(OPEN_FULL_GRAPH_BUTTON_TEST_ID));

    expect(mockNavigateWithFlyout).toHaveBeenCalledTimes(1);
    expect(mockNavigateWithFlyout).toHaveBeenCalledWith(
      expect.objectContaining({
        appId: APP_UI_ID,
        flyout: expect.objectContaining({
          left: expect.objectContaining({
            id: 'host_details',
            params: expect.objectContaining({
              hostName: 'server1',
              entityStoreEntityId: 'host:server1',
              path: { tab: EntityDetailsLeftPanelTab.GRAPH_VIEW },
            }),
          }),
          right: expect.objectContaining({ id: 'host-panel' }),
        }),
      })
    );
  });

  it.each([true, false])(
    'forwards isNewFlyoutEnabled=%s to navigateToEntityAnalyticsWithFlyoutInApp',
    (isNewFlyoutEnabled) => {
      renderInline(dataFor('host', 'server1', 'host:server1'), isNewFlyoutEnabled);
      fireEvent.click(screen.getByTestId(OPEN_FULL_GRAPH_BUTTON_TEST_ID));

      expect(mockNavigateWithFlyout).toHaveBeenCalledWith(
        expect.objectContaining({
          isNewFlyoutEnabled,
        })
      );
    }
  );

  it('opens the user details flyout with identity fields', () => {
    renderInline(dataFor('user', 'jdoe', 'user:jdoe'));
    fireEvent.click(screen.getByTestId(OPEN_FULL_GRAPH_BUTTON_TEST_ID));

    const { flyout } = mockNavigateWithFlyout.mock.calls[0][0];
    expect(flyout.left.id).toBe('user_details');
    expect(flyout.left.params.identityFields).toEqual({ 'user.name': 'jdoe' });
    expect(flyout.left.params.path).toEqual({ tab: EntityDetailsLeftPanelTab.GRAPH_VIEW });
    expect(flyout.right.id).toBe('user-panel');
  });

  it('opens the service details flyout centered on the entity id', () => {
    renderInline(dataFor('service', 'payments', 'service:payments'));
    fireEvent.click(screen.getByTestId(OPEN_FULL_GRAPH_BUTTON_TEST_ID));

    const { flyout } = mockNavigateWithFlyout.mock.calls[0][0];
    expect(flyout.left.id).toBe('service_details');
    expect(flyout.left.params.entityStoreEntityId).toBe('service:payments');
    expect(flyout.right.id).toBe('service-panel');
  });

  it('shows no "Open full graph" affordance for generic entities (no dedicated flyout)', () => {
    renderInline(dataFor('generic', 'thing', 'generic:thing'));
    expect(screen.queryByTestId(OPEN_FULL_GRAPH_BUTTON_TEST_ID)).toBeNull();
    expect(mockNavigateWithFlyout).not.toHaveBeenCalled();
  });
});
