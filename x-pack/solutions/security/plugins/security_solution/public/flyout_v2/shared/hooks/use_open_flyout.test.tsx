/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { useOpenFlyout } from './use_open_flyout';
import { useKibana } from '../../../common/lib/kibana';
import { flyoutProviders } from '../components/flyout_provider';
import { FlyoutV2EventTypes } from '../../../common/lib/telemetry';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useStore: jest.fn(() => ({})),
}));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: jest.fn(() => ({})),
}));
jest.mock('../../../common/lib/kibana');
jest.mock('../components/flyout_provider', () => ({
  flyoutProviders: jest.fn(() => 'FLYOUT_CONTENT'),
}));

const mockOpenSystemFlyout = jest.fn();
const mockReportEvent = jest.fn();

/** Builds a deferred `OverlayRef`-like value, letting the test resolve `onClose` on demand. */
const createOverlayRef = () => {
  let resolveClose: () => void = () => {};
  const onClose = new Promise<void>((resolve) => {
    resolveClose = resolve;
  });
  return { ref: { onClose, close: jest.fn() }, resolveClose: () => resolveClose() };
};

describe('useOpenFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        overlays: { openSystemFlyout: mockOpenSystemFlyout },
        telemetry: { reportEvent: mockReportEvent },
      },
    });
  });

  it('opens the system flyout with the wrapped children and given properties', () => {
    mockOpenSystemFlyout.mockReturnValue(createOverlayRef().ref);

    const { result } = renderHook(() => useOpenFlyout());
    result.current(<div>{'content'}</div>, { size: 's', session: 'start' });

    expect(flyoutProviders).toHaveBeenCalledTimes(1);
    expect(mockOpenSystemFlyout).toHaveBeenCalledWith('FLYOUT_CONTENT', {
      size: 's',
      session: 'start',
    });
  });

  it('returns the OverlayRef from openSystemFlyout', () => {
    const { ref } = createOverlayRef();
    mockOpenSystemFlyout.mockReturnValue(ref);

    const { result } = renderHook(() => useOpenFlyout());
    const returned = result.current(<div />, { size: 's', session: 'start' });

    expect(returned).toBe(ref);
  });

  it('does not report telemetry when no meta is given', () => {
    mockOpenSystemFlyout.mockReturnValue(createOverlayRef().ref);

    const { result } = renderHook(() => useOpenFlyout());
    result.current(<div />, { size: 's', session: 'start' });

    expect(mockReportEvent).not.toHaveBeenCalled();
  });

  it('reports the opened event immediately when meta is given', () => {
    mockOpenSystemFlyout.mockReturnValue(createOverlayRef().ref);

    const { result } = renderHook(() => useOpenFlyout());
    result.current(
      <div />,
      { size: 's', session: 'start' },
      {
        surface: 'flyout',
        flyoutType: 'document',
        session: 'start',
        origin: 'alerts_table',
      }
    );

    expect(mockReportEvent).toHaveBeenCalledWith(FlyoutV2EventTypes.FlyoutOpened, {
      surface: 'flyout',
      flyoutType: 'document',
      tool: undefined,
      session: 'start',
      origin: 'alerts_table',
    });
  });

  it('reports the closed event with a numeric duration once the flyout closes', async () => {
    const { ref, resolveClose } = createOverlayRef();
    mockOpenSystemFlyout.mockReturnValue(ref);

    const { result } = renderHook(() => useOpenFlyout());
    result.current(
      <div />,
      { size: 'm', session: 'inherit' },
      {
        surface: 'tool',
        tool: 'analyzer',
        flyoutType: 'document',
        session: 'inherit',
      }
    );

    resolveClose();
    await ref.onClose;
    // Let the `.then()` chained on `onClose` inside the hook flush.
    await Promise.resolve();

    const closedCall = mockReportEvent.mock.calls.find(
      ([eventType]) => eventType === FlyoutV2EventTypes.FlyoutClosed
    );
    expect(closedCall).toBeDefined();
    expect(closedCall?.[1]).toEqual(
      expect.objectContaining({
        flyoutType: 'document',
        tool: 'analyzer',
        session: 'inherit',
        durationMs: expect.any(Number),
      })
    );
  });
});
