/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { mount } from 'enzyme';
import { waitFor } from '@testing-library/react';

import { HostName } from './host_name';
import { TestProviders } from '../../../../../common/mock';
import { TimelineId, TimelineTabs } from '../../../../../../common/types/timeline';
import { StatefulEventContext } from '../../../../../common/components/events_viewer/stateful_event_context';
import { TableId } from '@kbn/securitysolution-data-table';
import { useFlyoutApi } from '../../../../../flyout_v2/use_flyout_api';
import { createEntityFlyoutApiMock } from '../../../../../flyout_v2/entity/use_entity_flyout_api.mock';

jest.mock('../../../../../common/components/draggables', () => ({
  DefaultDraggable: () => <div data-test-subj="DefaultDraggable" />,
}));

jest.mock('../../../../../flyout_v2/use_flyout_api');

describe('HostName', () => {
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
    fieldName: 'host.name',
    contextId: 'test-context-id',
    eventId: 'test-event-id',
    fieldType: 'keyword',
    isAggregatable: true,
    value: 'Mock Host',
  };

  test('should render host name', () => {
    const wrapper = mount(
      <TestProviders>
        <HostName {...props} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="host-details-button"]').last().text()).toEqual(
      props.value
    );
  });

  test('should not open any flyout or panels if context in not defined', async () => {
    const wrapper = mount(
      <TestProviders>
        <HostName {...props} />
      </TestProviders>
    );

    wrapper.find('[data-test-subj="host-details-button"]').last().simulate('click');
    await waitFor(() => {
      expect(flyoutApi.openHostFlyout).not.toHaveBeenCalled();
    });
  });

  test('should not open any flyout or panels if enableHostDetailsFlyout is false', async () => {
    const context = {
      enableHostDetailsFlyout: false,
      enableIpDetailsFlyout: true,
      timelineID: TimelineId.active,
      tabType: TimelineTabs.query,
    };

    const wrapper = mount(
      <TestProviders>
        <StatefulEventContext.Provider value={context}>
          <HostName {...props} />
        </StatefulEventContext.Provider>
      </TestProviders>
    );

    wrapper.find('[data-test-subj="host-details-button"]').last().simulate('click');
    await waitFor(() => {
      expect(flyoutApi.openHostFlyout).not.toHaveBeenCalled();
    });
  });

  test('should not open any flyout or panels if timelineID is not defined', async () => {
    const context = {
      enableHostDetailsFlyout: true,
      enableIpDetailsFlyout: true,
      timelineID: '',
      tabType: TimelineTabs.query,
    };

    const wrapper = mount(
      <TestProviders>
        <StatefulEventContext.Provider value={context}>
          <HostName {...props} />
        </StatefulEventContext.Provider>
      </TestProviders>
    );

    wrapper.find('[data-test-subj="host-details-button"]').last().simulate('click');
    await waitFor(() => {
      expect(flyoutApi.openHostFlyout).not.toHaveBeenCalled();
    });
  });

  test('should open the host flyout on table', async () => {
    const context = {
      enableHostDetailsFlyout: true,
      enableIpDetailsFlyout: true,
      timelineID: TableId.alertsOnAlertsPage,
      tabType: TimelineTabs.query,
    };
    const wrapper = mount(
      <TestProviders>
        <StatefulEventContext.Provider value={context}>
          <HostName {...props} />
        </StatefulEventContext.Provider>
      </TestProviders>
    );

    wrapper.find('[data-test-subj="host-details-button"]').last().simulate('click');
    await waitFor(() => {
      expect(flyoutApi.openHostFlyout).toHaveBeenCalledWith({
        hostName: props.value,
        entityId: undefined,
      });
    });
  });

  test('should open the host flyout in timeline', async () => {
    const context = {
      enableHostDetailsFlyout: true,
      enableIpDetailsFlyout: true,
      timelineID: TimelineId.active,
      tabType: TimelineTabs.query,
    };
    const wrapper = mount(
      <TestProviders>
        <StatefulEventContext.Provider value={context}>
          <HostName {...props} />
        </StatefulEventContext.Provider>
      </TestProviders>
    );

    wrapper.find('[data-test-subj="host-details-button"]').last().simulate('click');
    await waitFor(() => {
      expect(flyoutApi.openHostFlyout).toHaveBeenCalledTimes(1);
    });
    expect(flyoutApi.openHostFlyout).toHaveBeenCalledWith({
      hostName: props.value,
      entityId: undefined,
    });
  });
});
