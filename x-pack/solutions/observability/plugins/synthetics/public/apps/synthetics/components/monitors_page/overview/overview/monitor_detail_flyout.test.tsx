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
        timestamp: '2013-03-01 12:54:23',
        monitor: {
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
        observer: {},
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
    getByText(testErrorText);
  });

  it('renders loading state while fetching', () => {
    const { getByRole } = render(
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
            syntheticsMonitorLoading: true,
          },
        },
      }
    );

    expect(getByRole('progressbar'));
  });

  it('renders details for fetch success', () => {
    const detailLink = '/app/synthetics/monitor/test-id';
    jest.spyOn(monitorDetailLocator, 'useMonitorDetailLocator').mockReturnValue(detailLink);
    jest.spyOn(monitorDetailLocator, 'useMonitorDetailLocator').mockReturnValue(detailLink);

    const { getByRole, getByText, getAllByRole } = render(
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

    expect(getByText('Every 1 minute'));
    expect(getByText('test-id'));
    expect(getByText('Pending'));
    expect(
      getByRole('heading', {
        level: 2,
      })
    ).toHaveTextContent('test-monitor');
    const links = getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', 'https://www.elastic.co');
    expect(links[1]).toHaveAttribute('href', detailLink);
  });
});
