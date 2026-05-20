/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../../../utils/testing/rtl_helpers';
import { fireEvent } from '@testing-library/react';
import { MonitorDetailFlyout } from './monitor_detail_flyout';
import * as observabilitySharedPublic from '@kbn/observability-shared-plugin/public';
import * as monitorDetail from '../../../../hooks/use_monitor_detail';
import * as statusByLocation from '../../../../hooks/use_status_by_location';
import * as monitorDetailLocator from '../../../../hooks/use_monitor_detail_locator';
import { TagsList } from '@kbn/observability-shared-plugin/public';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { OBSERVABILITY_MONITOR_ATTACHMENT_TYPE_ID } from '@kbn/observability-agent-builder-plugin/public';

jest.mock('@kbn/observability-shared-plugin/public');

const TagsListMock = TagsList as jest.Mock;
TagsListMock.mockReturnValue(<div>Tags list</div>);

const useFetcherMock = useFetcher as jest.Mock;

useFetcherMock.mockReturnValue({
  data: { monitor: { tags: ['tag1', 'tag2'] } },
  status: 200,
  refetch: jest.fn(),
});

describe('Monitor Detail Flyout', () => {
  beforeEach(() => {
    jest
      .spyOn(observabilitySharedPublic, 'useTheme')
      .mockReturnValue({ eui: { euiColorVis0: 'red', euiColorVis9: 'red' } } as any);
    jest.spyOn(monitorDetail, 'useMonitorDetail').mockReturnValue({
      data: {
        docId: 'docId',
        monitor: {
          name: 'test monitor',
          id: 'test-id',
          status: 'up',
          type: 'http',
          check_group: 'check-group',
          timespan: {
            gte: 'now-15m',
            lt: 'now',
          },
        },
        url: {
          full: 'https://www.elastic.co',
        },
        tags: ['tag1', 'tag2'],
        observer: {
          name: 'us-east-1',
          geo: {
            name: 'US East',
          },
        },
        '@timestamp': '2013-03-01 12:54:23',
      },
    });
    jest.spyOn(statusByLocation, 'useStatusByLocation').mockReturnValue({
      locations: [],
      loading: false,
    });
  });

  afterEach(() => jest.clearAllMocks());

  it('close prop is called for built-in flyout close', () => {
    const onCloseMock = jest.fn();
    const { getByLabelText } = render(
      <MonitorDetailFlyout
        configId="123456"
        id="test-id"
        location="US East"
        locationId="us-east"
        onClose={onCloseMock}
        onEnabledChange={jest.fn()}
        onLocationChange={jest.fn()}
      />
    );
    const closeButton = getByLabelText('Close this dialog');
    fireEvent.click(closeButton);
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('renders error boundary for fetch failure', () => {
    const testErrorText = 'This is a test error';

    const { getByText } = render(
      <MonitorDetailFlyout
        configId="123456"
        id="test-id"
        location="US East"
        locationId="us-east"
        onClose={jest.fn()}
        onEnabledChange={jest.fn()}
        onLocationChange={jest.fn()}
      />,
      {
        state: {
          monitorDetails: {
            syntheticsMonitorError: { body: { message: 'This is a test error' } },
          },
        },
      }
    );
    getByText(testErrorText, { exact: false });
  });

  it('renders loading state while fetching', () => {
    const { getByRole, getByText } = render(
      <MonitorDetailFlyout
        configId="123456"
        id="test-id"
        location="US East"
        locationId="us-east"
        onClose={jest.fn()}
        onEnabledChange={jest.fn()}
        onLocationChange={jest.fn()}
      />,
      {
        state: {
          monitorDetails: {
            syntheticsMonitor: null,
            syntheticsMonitorLoading: true,
          },
        },
      }
    );

    expect(getByRole('dialog')).toBeInTheDocument();
    expect(getByText('Overview')).toBeInTheDocument();
    expect(getByText('Performance')).toBeInTheDocument();
    expect(getByText('Details')).toBeInTheDocument();
  });

  it('renders details for fetch success', () => {
    const detailLink = '/app/synthetics/monitor/test-id';
    jest.spyOn(monitorDetailLocator, 'useMonitorDetailLocator').mockReturnValue(detailLink);
    jest.spyOn(monitorDetailLocator, 'useMonitorDetailLocator').mockReturnValue(detailLink);

    const { getByRole, getByText } = render(
      <MonitorDetailFlyout
        configId="123456"
        id="test-id"
        location="US East"
        locationId="us-east"
        onClose={jest.fn()}
        onEnabledChange={jest.fn()}
        onLocationChange={jest.fn()}
      />,
      {
        state: {
          monitorDetails: {
            syntheticsMonitor: {
              enabled: true,
              type: 'http',
              name: 'test-monitor',
              schedule: {
                number: '1',
                unit: 'm',
              },
              tags: ['prod'],
              config_id: 'test-id',
            } as any,
          },
        },
      }
    );

    expect(
      getByRole('heading', {
        level: 2,
      })
    ).toHaveTextContent('test-monitor');
    expect(getByText('Last 24 hours'));
    expect(getByText('Overview'));
    expect(getByText('Performance'));
    expect(getByText('Details'));

    fireEvent.click(getByText('Details'));
    expect(getByText('Every 1 minute'));
    expect(getByText('test-id'));
  });

  describe('remote monitor flyout', () => {
    it('renders remote monitor details panel instead of infinite spinner', () => {
      const { getByText, queryByRole } = render(
        <MonitorDetailFlyout
          configId="remote-config-id"
          id="remote-monitor-id"
          location="europe-west3-a"
          locationId="europe-west3-a"
          onClose={jest.fn()}
          onEnabledChange={jest.fn()}
          onLocationChange={jest.fn()}
        />,
        {
          state: {
            monitorDetails: {
              syntheticsMonitor: null,
              syntheticsMonitorLoading: false,
            },
            overviewStatus: {
              status: {
                upConfigs: {
                  'remote-config-id-europe-west3-a': {
                    monitorQueryId: 'remote-monitor-id',
                    configId: 'remote-config-id',
                    name: 'Remote HTTPS Monitor',
                    type: 'http',
                    schedule: '10',
                    tags: ['production'],
                    isEnabled: true,
                    isStatusAlertEnabled: false,
                    overallStatus: 'up',
                    urls: 'https://medium.com/',
                    remote: {
                      remoteName: 'remote-cluster-1',
                      kibanaUrl: 'https://remote-kibana.example.com',
                    },
                    locations: [{ id: 'europe-west3-a', label: 'europe-west3-a', status: 'up' }],
                  },
                },
                downConfigs: {},
                pendingConfigs: {},
                disabledConfigs: {},
              },
            },
          },
        }
      );

      fireEvent.click(getByText('Details'));

      // Should show the remote monitor details, not a loading spinner
      expect(getByText('Monitor details')).toBeInTheDocument();
      expect(getByText('remote-config-id')).toBeInTheDocument();
      expect(getByText('Remote cluster')).toBeInTheDocument();
      expect(getByText('remote-cluster-1')).toBeInTheDocument();
      expect(queryByRole('progressbar')).not.toBeInTheDocument();
    });

    it('renders "View on remote cluster" button instead of "Go to monitor"', () => {
      const { getByText, queryByText } = render(
        <MonitorDetailFlyout
          configId="remote-config-id"
          id="remote-monitor-id"
          location="europe-west3-a"
          locationId="europe-west3-a"
          onClose={jest.fn()}
          onEnabledChange={jest.fn()}
          onLocationChange={jest.fn()}
        />,
        {
          state: {
            monitorDetails: {
              syntheticsMonitor: null,
            },
            overviewStatus: {
              status: {
                upConfigs: {
                  'remote-config-id-europe-west3-a': {
                    monitorQueryId: 'remote-monitor-id',
                    configId: 'remote-config-id',
                    name: 'Remote HTTPS Monitor',
                    type: 'http',
                    schedule: '10',
                    tags: [],
                    isEnabled: true,
                    isStatusAlertEnabled: false,
                    overallStatus: 'up',
                    remote: {
                      remoteName: 'remote-cluster-1',
                      kibanaUrl: 'https://remote-kibana.example.com',
                    },
                    locations: [{ id: 'europe-west3-a', label: 'europe-west3-a', status: 'up' }],
                  },
                },
                downConfigs: {},
                pendingConfigs: {},
                disabledConfigs: {},
              },
            },
          },
        }
      );

      expect(getByText('View on remote cluster')).toBeInTheDocument();
      expect(queryByText('Go to monitor')).not.toBeInTheDocument();
      expect(queryByText('Edit monitor')).not.toBeInTheDocument();
    });
  });

  describe('agent builder attachment', () => {
    const mockSetChatConfig = jest.fn();
    const mockClearChatConfig = jest.fn();
    const mockAgentBuilder = {
      setChatConfig: mockSetChatConfig,
      clearChatConfig: mockClearChatConfig,
    };

    const monitorState = {
      monitorDetails: {
        syntheticsMonitor: {
          enabled: true,
          type: 'http',
          name: 'test-monitor',
          schedule: { number: '1', unit: 'm' },
          tags: ['prod'],
          config_id: 'test-config-id',
        } as any,
      },
    };

    it('configures attachment when agentBuilder is available and monitor is loaded', () => {
      render(
        <MonitorDetailFlyout
          configId="test-config-id"
          id="test-id"
          location="US East"
          locationId="us-east"
          onClose={jest.fn()}
          onEnabledChange={jest.fn()}
          onLocationChange={jest.fn()}
        />,
        {
          state: monitorState,
          core: { agentBuilder: mockAgentBuilder } as any,
        }
      );

      expect(mockSetChatConfig).toHaveBeenCalledWith({
        attachments: [
          {
            type: OBSERVABILITY_MONITOR_ATTACHMENT_TYPE_ID,
            data: {
              attachmentLabel: 'test-monitor monitor',
              configId: 'test-config-id',
              monitorName: 'test-monitor',
              monitorType: 'http',
            },
          },
        ],
      });
    });

    it('does not configure attachment when agentBuilder is not available', () => {
      render(
        <MonitorDetailFlyout
          configId="test-config-id"
          id="test-id"
          location="US East"
          locationId="us-east"
          onClose={jest.fn()}
          onEnabledChange={jest.fn()}
          onLocationChange={jest.fn()}
        />,
        {
          state: monitorState,
        }
      );

      expect(mockSetChatConfig).not.toHaveBeenCalled();
    });

    it('clears attachment config on unmount', () => {
      const { unmount } = render(
        <MonitorDetailFlyout
          configId="test-config-id"
          id="test-id"
          location="US East"
          locationId="us-east"
          onClose={jest.fn()}
          onEnabledChange={jest.fn()}
          onLocationChange={jest.fn()}
        />,
        {
          state: monitorState,
          core: { agentBuilder: mockAgentBuilder } as any,
        }
      );

      expect(mockSetChatConfig).toHaveBeenCalledTimes(1);

      unmount();

      expect(mockClearChatConfig).toHaveBeenCalledTimes(1);
    });
  });
});
