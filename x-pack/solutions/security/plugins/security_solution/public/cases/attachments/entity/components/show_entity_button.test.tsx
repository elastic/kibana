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
import { FLYOUT_ORIGIN } from '../../../../common/lib/telemetry';

const props = {
  id: 'action-id',
  entityId: 'entity-euid-1',
  entityName: 'alice',
  entityType: 'user',
};

jest.mock('../../../../flyout_v2/use_flyout_api');

describe('ShowEntityButton', () => {
  let flyoutApi: ReturnType<typeof createFlyoutApiMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    flyoutApi = createFlyoutApiMock();
    jest.mocked(useFlyoutApi).mockReturnValue(flyoutApi);
  });

  it('renders the show entity button', () => {
    render(<ShowEntityButton {...props} />);
    expect(screen.getByTestId('comment-action-show-entity-action-id')).toBeInTheDocument();
  });

  it('opens the entity flyout', () => {
    render(<ShowEntityButton {...props} />);
    fireEvent.click(screen.getByTestId('comment-action-show-entity-action-id'));

    expect(flyoutApi.openEntityFlyout).toHaveBeenCalledWith({
      engineType: 'user',
      entityId: 'entity-euid-1',
      entityName: 'alice',
      scopeId: 'timeline-case',
      origin: FLYOUT_ORIGIN.CASE_ATTACHMENT,
    });
  });

  it('opens the entity flyout for a generic entity', () => {
    render(<ShowEntityButton {...props} entityType="generic" />);
    fireEvent.click(screen.getByTestId('comment-action-show-entity-action-id'));

    expect(flyoutApi.openEntityFlyout).toHaveBeenCalledWith(
      expect.objectContaining({ engineType: 'generic' })
    );
  });
});
