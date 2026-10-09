/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FormattedIp } from '.';
import { TestProviders } from '../../../common/mock';
import { TimelineId, TimelineTabs } from '../../../../common/types/timeline';
import { StatefulEventContext } from '../../../common/components/events_viewer/stateful_event_context';
import { NetworkPanelKey } from '../../../flyout/network_details';
import { FlowTargetSourceDest } from '../../../../common/search_strategy/security_solution/network';
import { createExpandableFlyoutApiMock } from '../../../common/mock/expandable_flyout';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useIsNewFlyoutEnabled } from '../../../common/hooks/use_is_new_flyout_enabled';
import { useFlyoutApi } from '../../../flyout_v2/use_flyout_api';
import { createFlyoutApiMock } from '../../../flyout_v2/use_flyout_api.mock';
import { FLYOUT_ORIGIN } from '../../../common/lib/telemetry';

jest.mock('../../../common/hooks/use_is_new_flyout_enabled');
jest.mock('../../../flyout_v2/use_flyout_api');

jest.mock('react-redux-v7', () => {
  const origin = jest.requireActual('react-redux-v7');
  return {
    ...origin,
    useDispatch: jest.fn().mockReturnValue(jest.fn()),
  };
});

jest.mock('../../../common/lib/kibana/kibana_react', () => ({
  ...jest.requireActual('../../../common/lib/kibana/kibana_react'),
  useKibana: jest.fn().mockReturnValue({
    services: {
      application: {
        getUrlForApp: jest.fn(),
        navigateToApp: jest.fn(),
      },
    },
  }),
}));

jest.mock('../../store');

const mockOpenFlyout = jest.fn();
jest.mock('@kbn/expandable-flyout');

describe('FormattedIp', () => {
  let flyoutApi: ReturnType<typeof createFlyoutApiMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useExpandableFlyoutApi).mockReturnValue({
      ...createExpandableFlyoutApiMock(),
      openFlyout: mockOpenFlyout,
    });
    flyoutApi = createFlyoutApiMock();
    jest.mocked(useFlyoutApi).mockReturnValue(flyoutApi);
    jest.mocked(useIsNewFlyoutEnabled).mockReturnValue(false);
  });

  const props = {
    value: '192.168.1.1',
    contextId: 'test-context-id',
    eventId: 'test-event-id',
    isAggregatable: true,
    fieldType: 'ip',
    fieldName: 'host.ip',
  };

  test('should render ip address', () => {
    render(
      <TestProviders>
        <FormattedIp {...props} />
      </TestProviders>
    );

    expect(screen.getByText(props.value)).toBeInTheDocument();
  });

  describe('button variant (Component prop set)', () => {
    const context = {
      enableHostDetailsFlyout: true,
      enableIpDetailsFlyout: true,
      timelineID: TimelineId.active,
      tabType: TimelineTabs.query,
    };

    test('when new flyout is disabled, should open the legacy NetworkDetails expandable flyout', async () => {
      jest.mocked(useIsNewFlyoutEnabled).mockReturnValue(false);

      render(
        <TestProviders>
          <StatefulEventContext.Provider value={context}>
            <FormattedIp {...props} Component={EuiButtonEmpty} isButton />
          </StatefulEventContext.Provider>
        </TestProviders>
      );

      await userEvent.click(screen.getByTestId('data-grid-network-details'));

      expect(mockOpenFlyout).toHaveBeenCalledWith({
        right: {
          id: NetworkPanelKey,
          params: {
            ip: props.value,
            scopeId: TimelineId.active,
            flowTarget: FlowTargetSourceDest.source,
          },
        },
      });
      expect(flyoutApi.openNetworkFlyout).not.toHaveBeenCalled();
    });

    test('when new flyout is enabled, should open the new network flyout', async () => {
      jest.mocked(useIsNewFlyoutEnabled).mockReturnValue(true);

      render(
        <TestProviders>
          <StatefulEventContext.Provider value={context}>
            <FormattedIp {...props} Component={EuiButtonEmpty} isButton />
          </StatefulEventContext.Provider>
        </TestProviders>
      );

      await userEvent.click(screen.getByTestId('data-grid-network-details'));

      expect(flyoutApi.openNetworkFlyout).toHaveBeenCalledWith({
        ip: props.value,
        flowTarget: FlowTargetSourceDest.source,
        origin: FLYOUT_ORIGIN.TABLE_FIELD_LINK,
      });
      expect(mockOpenFlyout).not.toHaveBeenCalled();
    });
  });
});
