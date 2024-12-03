/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import * as reactRedux from 'react-redux';
import { useBins, useMonitorStatusData } from './use_monitor_status_data';
import { WrappedHelper } from '../../../utils/testing';
import * as selectedMonitorHook from '../hooks/use_selected_monitor';
import * as selectedLocationHook from '../hooks/use_selected_location';
import { omit } from 'lodash';

describe('useMonitorStatusData', () => {
  let dispatchMock: jest.Mock;
  beforeEach(() => {
    dispatchMock = jest.fn();
    jest.spyOn(reactRedux, 'useDispatch').mockReturnValue(dispatchMock);
    jest.spyOn(selectedLocationHook, 'useSelectedLocation').mockReturnValue({
      id: 'us-east-1',
      label: 'us-east-1',
      isServiceManaged: true,
    });
    jest.spyOn(selectedMonitorHook, 'useSelectedMonitor').mockReturnValue({
      monitor: {
        id: 'testMonitorId',
        type: 'browser',
        name: 'testMonitor',
        enabled: true,
        schedule: {
          number: 5,
          unit: 'm',
        },
        locations: ['us-east-1'],
        tags: [],
        apiKey: '1234',
        config: {
          synthetics: {
            type: 'simple',
            timeout: 10,
            frequency: 5,
            url: 'http://elastic.co',
            method: 'GET',
            request: {
              headers: {},
            },
            response: {
              status: 200,
            },
          },
        },
      },
    } as any);
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does not request status data when interval is invalid', async () => {
    const props = {
      from: 1728310613654,
      to: 1728311513654,
      initialSizeRef: { current: { clientWidth: 0 } as any },
    };
    const { result } = renderHook(() => useMonitorStatusData(props), {
      wrapper: WrappedHelper,
    });
    expect(result.current).toBeDefined();
    expect(result.current.minsPerBin).toBeNull();
    expect(
      dispatchMock.mock.calls.some((args) => args[0].type === 'QUIET GET MONITOR STATUS HEATMAP')
    ).not.toBe(true);
  });

  it('handles resize events and requests based on new data', async () => {
    const props = {
      from: 1728310613654,
      to: 1728317313654,
      initialSizeRef: { current: { clientWidth: 0 } as any },
    };
    const { result } = renderHook(() => useMonitorStatusData(props), {
      wrapper: WrappedHelper,
    });
    await act(async () => {
      result.current.handleResize({ width: 250, height: 800 });
      // this is necessary for debounce to complete
      await new Promise((r) => setTimeout(r, 510));
    });
    const fetchActions = dispatchMock.mock.calls.filter(
      (args) => args[0].type === 'QUIET GET MONITOR STATUS HEATMAP'
    );
    expect(fetchActions).toHaveLength(1);
    expect(omit(fetchActions[0][0], 'meta')).toMatchInlineSnapshot(`
      Object {
        "payload": Object {
          "from": 1728310613654,
          "interval": 7,
          "location": "us-east-1",
          "monitorId": "testMonitorId",
          "to": 1728317313654,
        },
        "type": "QUIET GET MONITOR STATUS HEATMAP",
      }
    `);
  });
});

describe('useBins', () => {
  it('generates bins and overlays histogram data', () => {
    const { result } = renderHook(
      () =>
        useBins({
          minsPerBin: 5,
          fromMillis: 1728310613654,
          toMillis: 1728313563654,
          dateHistogram: [
            {
              key: 1728310613654,
              key_as_string: '2023-06-06T00:56:53.654Z',
              doc_count: 1,
              down: {
                value: 0,
              },
              up: {
                value: 1,
              },
            },
            {
              key: 1728310613654 + 300000,
              key_as_string: '2023-06-06T00:56:53.654Z',
              doc_count: 1,
              down: {
                value: 0,
              },
              up: {
                value: 1,
              },
            },
            {
              key: 1728310613654 + 600000,
              key_as_string: '2023-06-06T00:56:53.654Z',
              doc_count: 1,
              down: {
                value: 1,
              },
              up: {
                value: 0,
              },
            },
            {
              key: 1728310613654 + 900000,
              key_as_string: '2023-06-06T00:56:53.654Z',
              doc_count: 1,
              down: {
                value: 2,
              },
              up: {
                value: 1,
              },
            },
          ],
        }),
      { wrapper: WrappedHelper }
    );
    expect(result.current).toMatchInlineSnapshot(`
      Object {
        "timeBinMap": Map {
          1728310800000 => Object {
            "downs": 0,
            "end": 1728310800000,
            "start": 1728310500000,
            "ups": 1,
            "value": 1,
          },
          1728311100000 => Object {
            "downs": 0,
            "end": 1728311100000,
            "start": 1728310800000,
            "ups": 1,
            "value": 1,
          },
          1728311400000 => Object {
            "downs": 1,
            "end": 1728311400000,
            "start": 1728311100000,
            "ups": 0,
            "value": -1,
          },
          1728311700000 => Object {
            "downs": 2,
            "end": 1728311700000,
            "start": 1728311400000,
            "ups": 1,
            "value": -0.3333333333333333,
          },
          1728312000000 => Object {
            "downs": 0,
            "end": 1728312000000,
            "start": 1728311700000,
            "ups": 0,
            "value": 0,
          },
          1728312300000 => Object {
            "downs": 0,
            "end": 1728312300000,
            "start": 1728312000000,
            "ups": 0,
            "value": 0,
          },
          1728312600000 => Object {
            "downs": 0,
            "end": 1728312600000,
            "start": 1728312300000,
            "ups": 0,
            "value": 0,
          },
          1728312900000 => Object {
            "downs": 0,
            "end": 1728312900000,
            "start": 1728312600000,
            "ups": 0,
            "value": 0,
          },
          1728313200000 => Object {
            "downs": 0,
            "end": 1728313200000,
            "start": 1728312900000,
            "ups": 0,
            "value": 0,
          },
          1728313500000 => Object {
            "downs": 0,
            "end": 1728313500000,
            "start": 1728313200000,
            "ups": 0,
            "value": 0,
          },
          1728313800000 => Object {
            "downs": 0,
            "end": 1728313800000,
            "start": 1728313500000,
            "ups": 0,
            "value": 0,
          },
        },
        "timeBins": Array [
          Object {
            "downs": 0,
            "end": 1728310800000,
            "start": 1728310500000,
            "ups": 1,
            "value": 1,
          },
          Object {
            "downs": 0,
            "end": 1728311100000,
            "start": 1728310800000,
            "ups": 1,
            "value": 1,
          },
          Object {
            "downs": 1,
            "end": 1728311400000,
            "start": 1728311100000,
            "ups": 0,
            "value": -1,
          },
          Object {
            "downs": 2,
            "end": 1728311700000,
            "start": 1728311400000,
            "ups": 1,
            "value": -0.3333333333333333,
          },
          Object {
            "downs": 0,
            "end": 1728312000000,
            "start": 1728311700000,
            "ups": 0,
            "value": 0,
          },
          Object {
            "downs": 0,
            "end": 1728312300000,
            "start": 1728312000000,
            "ups": 0,
            "value": 0,
          },
          Object {
            "downs": 0,
            "end": 1728312600000,
            "start": 1728312300000,
            "ups": 0,
            "value": 0,
          },
          Object {
            "downs": 0,
            "end": 1728312900000,
            "start": 1728312600000,
            "ups": 0,
            "value": 0,
          },
          Object {
            "downs": 0,
            "end": 1728313200000,
            "start": 1728312900000,
            "ups": 0,
            "value": 0,
          },
          Object {
            "downs": 0,
            "end": 1728313500000,
            "start": 1728313200000,
            "ups": 0,
            "value": 0,
          },
          Object {
            "downs": 0,
            "end": 1728313800000,
            "start": 1728313500000,
            "ups": 0,
            "value": 0,
          },
        ],
        "xDomain": Object {
          "max": 1728313800000,
          "min": 1728310800000,
        },
      }
    `);
  });

  it('returns a default value if interval is not valid', () => {
    const { result } = renderHook(
      () =>
        useBins({
          minsPerBin: null,
          fromMillis: 1728310613654,
          toMillis: 1728313563654,
        }),
      { wrapper: WrappedHelper }
    );
    expect(result.current).toMatchInlineSnapshot(`
      Object {
        "timeBinMap": Map {},
        "timeBins": Array [],
        "xDomain": Object {
          "max": 1728313563654,
          "min": 1728310613654,
        },
      }
    `);
  });
});
