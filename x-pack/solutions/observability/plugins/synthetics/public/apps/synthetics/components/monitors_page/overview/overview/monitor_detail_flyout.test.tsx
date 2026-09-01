/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import * as reduxHooks from 'react-redux';
import { render } from '../../../../utils/testing/rtl_helpers';
import { fireEvent } from '@testing-library/react';
import { MonitorDetailFlyout, getDurationChartTimeRange } from './monitor_detail_flyout';
import * as observabilitySharedPublic from '@kbn/observability-shared-plugin/public';
import * as monitorDetail from '../../../../hooks/use_monitor_detail';
import * as statusByLocation from '../../../../hooks/use_status_by_location';
import * as monitorDetailLocator from '../../../../hooks/use_monitor_detail_locator';
import { TagsList } from '@kbn/observability-shared-plugin/public';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { getMonitorAction } from '../../../../state';

jest.mock('@kbn/observability-shared-plugin/public');

const TagsListMock = TagsList as jest.Mock;
TagsListMock.mockReturnValue(<div>Tags list</div>);

const useFetcherMock = useFetcher as jest.Mock;

useFetcherMock.mockReturnValue({
  data: { monitor: { tags: ['tag1', 'tag2'] } },
  status: 200,
  refetch: jest.fn(),
});

interface DurationChartAttribute {
  time: {
    from: string;
    to: string;
  };
  reportDefinitions: {
    'monitor.id': string[];
  };
}

interface ExploratoryViewEmbeddableProps {
  attributes: readonly [DurationChartAttribute, ...DurationChartAttribute[]];
}

const exploratoryViewEmbeddableMock = jest.fn((_props: ExploratoryViewEmbeddableProps) => null);

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
            syntheticsMonitor: null,
            syntheticsMonitorLoading: true,
          },
        },
      }
    );

    expect(getByRole('progressbar'));
  });

  it('hides the error callout when overview metadata is present', () => {
    const testErrorText = 'This is a test error';

    const { queryByText } = render(
      <MonitorDetailFlyout
        configId="4afd3980-0b72-11ed-9c10-b57918ea89d6"
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
            syntheticsMonitorError: { body: { message: testErrorText } },
          },
          overviewStatus: {
            status: {
              upConfigs: {
                '4afd3980-0b72-11ed-9c10-b57918ea89d6-us_central': {
                  configId: '4afd3980-0b72-11ed-9c10-b57918ea89d6',
                  name: 'One pixel monitor',
                  locationId: 'us_central',
                  locationLabel: 'US Central',
                  status: 'up',
                  type: 'browser',
                  schedule: '10',
                  isEnabled: true,
                  isStatusAlertEnabled: false,
                  spaces: ['default'],
                  tags: [],
                },
              },
            },
          } as any,
        },
      }
    );

    expect(queryByText(testErrorText, { exact: false })).toBeNull();
  });

  it('does not dispatch getMonitorAction before the active space resolves', () => {
    // Simulate `useKibanaSpace` (which is the only `useFetcher` consumer in
    // this component) still loading — `space` is undefined across renders.
    // Previously the flyout would dispatch `getMonitorAction.get` without
    // `spaceId`, hit the active space, and 404 for cross-space monitors.
    // The retry that fires once `space` resolves was then silently dropped
    // by the `takeLeading` saga while the first call was still in flight,
    // leaving the 404 in Redux state forever.
    const previousFetcherImpl = useFetcherMock.getMockImplementation();
    useFetcherMock.mockReturnValue({
      data: undefined,
      loading: true,
      refetch: jest.fn(),
    });

    const mockDispatch = jest.fn();
    jest.spyOn(reduxHooks, 'useDispatch').mockReturnValue(mockDispatch);

    try {
      render(
        <MonitorDetailFlyout
          configId="cross-space-monitor"
          id="cross-space-monitor"
          location="US East"
          locationId="us-east"
          spaces={['team-a']}
          onClose={jest.fn()}
          onEnabledChange={jest.fn()}
          onLocationChange={jest.fn()}
        />
      );

      const getMonitorCalls = mockDispatch.mock.calls.filter(
        ([action]) => action?.type === getMonitorAction.get.type
      );
      expect(getMonitorCalls).toHaveLength(0);
    } finally {
      if (previousFetcherImpl) {
        useFetcherMock.mockImplementation(previousFetcherImpl);
      }
    }
  });

  it('renders details for fetch success', () => {
    const detailLink = '/app/synthetics/monitor/test-id';
    jest.spyOn(monitorDetailLocator, 'useMonitorDetailLocator').mockReturnValue(detailLink);
    jest.spyOn(monitorDetailLocator, 'useMonitorDetailLocator').mockReturnValue(detailLink);

    const { getByRole, getByText, getAllByRole } = render(
      <MonitorDetailFlyout
        configId="test-id"
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

describe('getDurationChartTimeRange', () => {
  const now = moment('2026-07-13T12:00:00.000Z');

  it('uses the default 12h window with a previous-period comparison when no created_at is provided', () => {
    expect(getDurationChartTimeRange(undefined, now)).toEqual({
      from: 'now-12h',
      showPreviousPeriod: true,
    });
  });

  it('keeps the default window for monitors older than the look-back window', () => {
    const createdAt = now.clone().subtract(3, 'days').toISOString();
    expect(getDurationChartTimeRange(createdAt, now)).toEqual({
      from: 'now-12h',
      showPreviousPeriod: true,
    });
  });

  it('keeps the default window at the exact 12h boundary', () => {
    const createdAt = now.clone().subtract(12, 'hours').toISOString();
    expect(getDurationChartTimeRange(createdAt, now)).toEqual({
      from: 'now-12h',
      showPreviousPeriod: true,
    });
  });

  it('anchors the lower bound at creation time and hides the previous period for young monitors', () => {
    const createdAt = now.clone().subtract(2, 'hours').toISOString();
    expect(getDurationChartTimeRange(createdAt, now)).toEqual({
      from: createdAt,
      showPreviousPeriod: false,
    });
  });

  it('falls back to the default window for an invalid created_at', () => {
    expect(getDurationChartTimeRange('not-a-date', now)).toEqual({
      from: 'now-12h',
      showPreviousPeriod: true,
    });
  });
});

describe('duration chart attributes', () => {
  const renderDurationChart = (createdAt?: string) => {
    exploratoryViewEmbeddableMock.mockClear();

    render<{
      exploratoryView: { ExploratoryViewEmbeddable: typeof exploratoryViewEmbeddableMock };
    }>(
      <MonitorDetailFlyout
        configId="test-id"
        id="test-id"
        location="US East"
        locationId="us-east"
        onClose={jest.fn()}
        onEnabledChange={jest.fn()}
        onLocationChange={jest.fn()}
      />,
      {
        core: {
          exploratoryView: { ExploratoryViewEmbeddable: exploratoryViewEmbeddableMock },
        },
        state: {
          monitorDetails: {
            syntheticsMonitor: {
              config_id: 'test-id',
              created_at: createdAt,
            } as any,
          },
        },
      }
    );

    const embeddableCall = exploratoryViewEmbeddableMock.mock.calls[0];
    if (!embeddableCall) {
      throw new Error('Expected the duration chart embeddable to render');
    }
    return embeddableCall[0].attributes;
  };

  it('omits the previous-period series for a young monitor', () => {
    const createdAt = moment().subtract(2, 'hours').toISOString();
    const attributes = renderDurationChart(createdAt);

    expect(attributes).toHaveLength(1);
    expect(attributes[0].time.from).toBe(createdAt);
  });

  it('includes the previous-period series when the default window is used', () => {
    const attributes = renderDurationChart();

    expect(attributes).toHaveLength(2);
    expect(attributes[0].time.from).toBe('now-12h');
    expect(attributes[1]?.time).toEqual({ from: 'now-24h', to: 'now-12h' });
  });

  it('waits for the active monitor saved object before rendering', () => {
    exploratoryViewEmbeddableMock.mockClear();

    render<{
      exploratoryView: { ExploratoryViewEmbeddable: typeof exploratoryViewEmbeddableMock };
    }>(
      <MonitorDetailFlyout
        configId="active-monitor"
        id="active-monitor"
        location="US East"
        locationId="us-east"
        onClose={jest.fn()}
        onEnabledChange={jest.fn()}
        onLocationChange={jest.fn()}
      />,
      {
        core: {
          exploratoryView: { ExploratoryViewEmbeddable: exploratoryViewEmbeddableMock },
        },
        state: {
          monitorDetails: {
            syntheticsMonitor: {
              config_id: 'previous-monitor',
              created_at: moment().subtract(2, 'hours').toISOString(),
            } as any,
          },
        },
      }
    );

    expect(exploratoryViewEmbeddableMock).not.toHaveBeenCalled();
  });

  it('renders the default window when the saved object 404s but overview metadata is available', () => {
    exploratoryViewEmbeddableMock.mockClear();

    const { queryByRole } = render<{
      exploratoryView: { ExploratoryViewEmbeddable: typeof exploratoryViewEmbeddableMock };
    }>(
      <MonitorDetailFlyout
        configId="cross-space-config-id"
        id="cross-space-id"
        location="US East"
        locationId="us-east"
        onClose={jest.fn()}
        onEnabledChange={jest.fn()}
        onLocationChange={jest.fn()}
      />,
      {
        core: {
          exploratoryView: { ExploratoryViewEmbeddable: exploratoryViewEmbeddableMock },
        },
        state: {
          monitorDetails: {
            syntheticsMonitor: null,
            syntheticsMonitorLoading: false,
            syntheticsMonitorError: {
              name: 'Error',
              requestUrl: '/internal/synthetics/monitor',
              body: { statusCode: 404, error: 'Not Found', message: 'Monitor not found' },
            },
          },
          overviewStatus: {
            status: {
              upConfigs: {
                'cross-space-config-id-us-east': {
                  monitorQueryId: 'cross-space-id',
                  configId: 'cross-space-config-id',
                  name: 'Cross-space monitor',
                  type: 'http',
                  schedule: '1',
                  tags: [],
                  isEnabled: true,
                  isStatusAlertEnabled: false,
                  status: 'up',
                  locationId: 'us-east',
                  locationLabel: 'US East',
                  spaces: ['team-a'],
                },
              },
              downConfigs: {},
            },
          },
        },
      }
    );

    expect(queryByRole('progressbar')).not.toBeInTheDocument();
    const embeddableCall = exploratoryViewEmbeddableMock.mock.calls[0];
    if (!embeddableCall) {
      throw new Error('Expected the duration chart embeddable to render');
    }
    expect(embeddableCall[0].attributes[0].time.from).toBe('now-12h');
  });

  it('queries ping series by monitorQueryId when it differs from configId (project monitors)', () => {
    exploratoryViewEmbeddableMock.mockClear();

    render<{
      exploratoryView: { ExploratoryViewEmbeddable: typeof exploratoryViewEmbeddableMock };
    }>(
      <MonitorDetailFlyout
        configId="01435ca1-2c1f-44de-ba4e-b0a7bd14ef5c"
        id="01435ca1-2c1f-44de-ba4e-b0a7bd14ef5c"
        location="US Central QA"
        locationId="us_central_qa"
        onClose={jest.fn()}
        onEnabledChange={jest.fn()}
        onLocationChange={jest.fn()}
      />,
      {
        core: {
          exploratoryView: { ExploratoryViewEmbeddable: exploratoryViewEmbeddableMock },
        },
        state: {
          monitorDetails: {
            syntheticsMonitor: {
              config_id: '01435ca1-2c1f-44de-ba4e-b0a7bd14ef5c',
              created_at: moment().subtract(3, 'days').toISOString(),
            } as any,
          },
          overviewStatus: {
            status: {
              upConfigs: {
                '01435ca1-2c1f-44de-ba4e-b0a7bd14ef5c-us_central_qa': {
                  monitorQueryId: 'elastic-us-central-qa-flyout-duration-chart-default',
                  configId: '01435ca1-2c1f-44de-ba4e-b0a7bd14ef5c',
                  name: 'Elastic.co US Central QA',
                  type: 'http',
                  schedule: '1',
                  tags: ['flyout-duration-chart'],
                  isEnabled: true,
                  isStatusAlertEnabled: false,
                  status: 'up',
                  locationId: 'us_central_qa',
                  locationLabel: 'US Central QA',
                },
              },
              downConfigs: {},
            },
          },
        },
      }
    );

    const embeddableCall = exploratoryViewEmbeddableMock.mock.calls[0];
    if (!embeddableCall) {
      throw new Error('Expected the duration chart embeddable to render');
    }
    expect(embeddableCall[0].attributes[0].reportDefinitions['monitor.id']).toEqual([
      'elastic-us-central-qa-flyout-duration-chart-default',
    ]);
  });
});
