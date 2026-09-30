/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShowEntityButton } from './show_entity_button';
import { useFlyoutApi } from '../../../../flyout_v2/use_flyout_api';
import { createFlyoutApiMock } from '../../../../flyout_v2/use_flyout_api.mock';
import { useIsNewFlyoutEnabled } from '../../../../common/hooks/use_is_new_flyout_enabled';
import { FLYOUT_ORIGIN } from '../../../../common/lib/telemetry';

const props = {
  id: 'action-id',
  entityId: 'entity-euid-1',
  entityName: 'alice',
  entityType: 'user',
};

const mockOpenFlyout = jest.fn();

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: () => ({ openFlyout: mockOpenFlyout }),
}));

jest.mock('../../../../flyout_v2/use_flyout_api');
jest.mock('../../../../common/hooks/use_is_new_flyout_enabled');

describe('ShowEntityButton', () => {
  let flyoutApi: ReturnType<typeof createFlyoutApiMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    flyoutApi = createFlyoutApiMock();
    jest.mocked(useFlyoutApi).mockReturnValue(flyoutApi);
    jest.mocked(useIsNewFlyoutEnabled).mockReturnValue(false);
  });

  it('renders the show entity button', () => {
    render(<ShowEntityButton {...props} />);
    expect(screen.getByTestId('comment-action-show-entity-action-id')).toBeInTheDocument();
  });

  it('opens the new entity flyout when the new flyout is enabled', () => {
    jest.mocked(useIsNewFlyoutEnabled).mockReturnValue(true);

    render(<ShowEntityButton {...props} />);
    fireEvent.click(screen.getByTestId('comment-action-show-entity-action-id'));

    expect(flyoutApi.openEntityFlyout).toHaveBeenCalledWith({
      engineType: 'user',
      entityId: 'entity-euid-1',
      entityName: 'alice',
      scopeId: 'timeline-case',
      origin: FLYOUT_ORIGIN.CASE_ATTACHMENT,
    });
    expect(mockOpenFlyout).not.toHaveBeenCalled();
  });

  it('opens the legacy expandable flyout for a user when the new flyout is disabled', () => {
    render(<ShowEntityButton {...props} />);
    fireEvent.click(screen.getByTestId('comment-action-show-entity-action-id'));

    expect(mockOpenFlyout).toHaveBeenCalledWith({
      right: {
        id: 'user-panel',
        params: { userName: 'alice', entityId: 'entity-euid-1', scopeId: 'timeline-case' },
      },
    });
    expect(flyoutApi.openEntityFlyout).not.toHaveBeenCalled();
  });

  it('opens the legacy expandable flyout for a host when the new flyout is disabled', () => {
    render(<ShowEntityButton {...props} entityType="host" entityName="my-host" />);
    fireEvent.click(screen.getByTestId('comment-action-show-entity-action-id'));

    expect(mockOpenFlyout).toHaveBeenCalledWith({
      right: {
        id: 'host-panel',
        params: { hostName: 'my-host', entityId: 'entity-euid-1', scopeId: 'timeline-case' },
      },
    });
  });

  it('does not open the legacy flyout for a generic entity (no legacy panel exists)', () => {
    render(<ShowEntityButton {...props} entityType="generic" />);
    fireEvent.click(screen.getByTestId('comment-action-show-entity-action-id'));

    expect(mockOpenFlyout).not.toHaveBeenCalled();
    expect(flyoutApi.openEntityFlyout).not.toHaveBeenCalled();
  });

  it('opens the new entity flyout for a generic entity when the new flyout is enabled', () => {
    jest.mocked(useIsNewFlyoutEnabled).mockReturnValue(true);

    render(<ShowEntityButton {...props} entityType="generic" />);
    fireEvent.click(screen.getByTestId('comment-action-show-entity-action-id'));

    expect(flyoutApi.openEntityFlyout).toHaveBeenCalledWith(
      expect.objectContaining({ engineType: 'generic' })
    );
    expect(mockOpenFlyout).not.toHaveBeenCalled();
  });
});
