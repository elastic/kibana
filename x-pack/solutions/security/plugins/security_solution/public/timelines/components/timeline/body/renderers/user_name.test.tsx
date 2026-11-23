/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TestProviders } from '../../../../../common/mock';
import { TimelineId, TimelineTabs } from '../../../../../../common/types/timeline';
import { UserName } from './user_name';
import { StatefulEventContext } from '../../../../../common/components/events_viewer/stateful_event_context';
import { TableId } from '@kbn/securitysolution-data-table';
import { useFlyoutApi } from '../../../../../flyout_v2/use_flyout_api';
import { createEntityFlyoutApiMock } from '../../../../../flyout_v2/entity/use_entity_flyout_api.mock';

jest.mock('../../../../../common/components/draggables', () => ({
  DefaultDraggable: () => <div data-test-subj="DefaultDraggable" />,
}));

jest.mock('../../../../../flyout_v2/use_flyout_api');

describe('UserName', () => {
  let flyoutApi: ReturnType<typeof createEntityFlyoutApiMock>;

  beforeEach(() => {
    flyoutApi = createEntityFlyoutApiMock();
    jest
      .mocked(useFlyoutApi)
      .mockReturnValue(flyoutApi as unknown as ReturnType<typeof useFlyoutApi>);
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  const props = {
    fieldName: 'user.name',
    fieldType: 'keyword',
    isAggregatable: true,
    eventId: 'test-event-id',
    value: 'Mock User',
  };

  test('should render user name', () => {
    render(
      <TestProviders>
        <UserName {...props} />
      </TestProviders>
    );

    expect(screen.getByTestId('users-link-anchor')).toHaveTextContent(props.value);
  });

  test('should not open any flyout or panels if context in not defined', async () => {
    render(
      <TestProviders>
        <UserName {...props} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('users-link-anchor'));
    await waitFor(() => {
      expect(flyoutApi.openUserFlyout).not.toHaveBeenCalled();
    });
  });

  test('should not open any flyout or panels if timelineID is not defined', async () => {
    const context = {
      enableHostDetailsFlyout: true,
      enableIpDetailsFlyout: true,
      timelineID: '',
      tabType: TimelineTabs.query,
    };

    render(
      <TestProviders>
        <StatefulEventContext.Provider value={context}>
          <UserName {...props} />
        </StatefulEventContext.Provider>
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('users-link-anchor'));
    await waitFor(() => {
      expect(flyoutApi.openUserFlyout).not.toHaveBeenCalled();
    });
  });

  test('should open the user flyout on table', async () => {
    const context = {
      enableHostDetailsFlyout: true,
      enableIpDetailsFlyout: true,
      timelineID: TableId.alertsOnAlertsPage,
      tabType: TimelineTabs.query,
    };
    render(
      <TestProviders>
        <StatefulEventContext.Provider value={context}>
          <UserName {...props} />
        </StatefulEventContext.Provider>
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('users-link-anchor'));
    await waitFor(() => {
      expect(flyoutApi.openUserFlyout).toHaveBeenCalledWith({
        userName: props.value,
        entityId: undefined,
      });
    });
  });

  test('should open the user flyout in timeline', async () => {
    const context = {
      enableHostDetailsFlyout: true,
      enableIpDetailsFlyout: true,
      timelineID: TimelineId.active,
      tabType: TimelineTabs.query,
    };
    render(
      <TestProviders>
        <StatefulEventContext.Provider value={context}>
          <UserName {...props} />
        </StatefulEventContext.Provider>
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('users-link-anchor'));
    await waitFor(() => {
      expect(flyoutApi.openUserFlyout).toHaveBeenCalledWith({
        userName: props.value,
        entityId: undefined,
      });
    });
  });
});
