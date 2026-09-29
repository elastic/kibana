/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useHistory } from 'react-router-dom';
import { decode } from '@kbn/rison';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import type { Indicator } from '../../../common/threat_intelligence/types/indicator';
import { useIocFlyoutApi } from './use_ioc_flyout_api';
import { useKibana } from '../../common/lib/kibana';
import { useIsInSecurityApp } from '../../common/hooks/is_in_security_app';
import { flyoutProviders } from '../shared/components/flyout_provider';
import { documentFlyoutHistoryKey } from '../shared/constants/flyout_history';
import {
  FlyoutV2EventTypes,
  FLYOUT_ORIGIN,
  FLYOUT_SURFACE,
  FLYOUT_TYPE,
  FLYOUT_SESSION_KIND,
} from '../../common/lib/telemetry';

vi.mock('react-redux-v7', () => {
      const mocked = {
      ...require('react-redux-v7'),
      useStore: vi.fn(() => ({})),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('react-router-dom', () => {
      const mocked = {
      ...require('react-router-dom'),
      useHistory: vi.fn(() => ({})),
    };
      return { ...mocked, default: mocked };
    });

const useHistoryMock = useHistory as Mock;
vi.mock('../../common/lib/kibana');
vi.mock('../../common/hooks/is_in_security_app');
vi.mock('../shared/components/flyout_provider', () => {
      const mocked = {
      flyoutProviders: vi.fn(() => 'FLYOUT_CONTENT'),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../shared/hooks/use_default_flyout_properties', () => {
      const mocked = {
      useDefaultDocumentFlyoutProperties: vi.fn(() => ({ size: 's' })),
    };
      return { ...mocked, default: mocked };
    });

const mockOpenSystemFlyout = vi.fn();
const mockReportEvent = vi.fn();
const indicator = {
  _id: 'ioc-1',
  fields: { 'threat.indicator.type': ['url'] },
} as unknown as Indicator;

describe('useIocFlyoutApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useHistoryMock.mockReturnValue({});
    mockOpenSystemFlyout.mockReturnValue({ onClose: Promise.resolve(), close: vi.fn() });
    (useKibana as Mock).mockReturnValue({
      services: {
        overlays: { openSystemFlyout: mockOpenSystemFlyout },
        storage: { get: vi.fn(), set: vi.fn(), remove: vi.fn() },
        telemetry: { reportEvent: mockReportEvent },
      },
    });
    (useIsInSecurityApp as Mock).mockReturnValue(true);
  });

  it('openIocFlyout opens a system flyout as a new session with the document properties', () => {
    const { result } = renderHook(() => useIocFlyoutApi());
    result.current.openIocFlyout({ indicator });

    expect(flyoutProviders).toHaveBeenCalledTimes(1);
    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      'FLYOUT_CONTENT',
      expect.objectContaining({ size: 's', session: 'start', historyKey: documentFlyoutHistoryKey })
    );
    expect(mockReportEvent).toHaveBeenCalledWith(FlyoutV2EventTypes.FlyoutOpened, {
      surface: FLYOUT_SURFACE.FLYOUT,
      flyoutType: FLYOUT_TYPE.IOC,
      tool: undefined,
      session: FLYOUT_SESSION_KIND.START,
      origin: undefined,
    });
  });

  it('openIocFlyout forwards the given origin', () => {
    const { result } = renderHook(() => useIocFlyoutApi());
    result.current.openIocFlyout({ indicator, origin: FLYOUT_ORIGIN.THREAT_INTEL_TABLE });

    expect(mockReportEvent).toHaveBeenCalledWith(FlyoutV2EventTypes.FlyoutOpened, {
      surface: FLYOUT_SURFACE.FLYOUT,
      flyoutType: FLYOUT_TYPE.IOC,
      tool: undefined,
      session: FLYOUT_SESSION_KIND.START,
      origin: FLYOUT_ORIGIN.THREAT_INTEL_TABLE,
    });
  });

  it('openIocFlyoutAsChild opens a system flyout that inherits the current session', () => {
    const { result } = renderHook(() => useIocFlyoutApi());
    result.current.openIocFlyoutAsChild({ indicator });

    expect(flyoutProviders).toHaveBeenCalledTimes(1);
    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      'FLYOUT_CONTENT',
      expect.objectContaining({
        size: 's',
        session: 'inherit',
        historyKey: documentFlyoutHistoryKey,
      })
    );
    expect(mockReportEvent).toHaveBeenCalledWith(FlyoutV2EventTypes.FlyoutOpened, {
      surface: FLYOUT_SURFACE.FLYOUT,
      flyoutType: FLYOUT_TYPE.IOC,
      tool: undefined,
      session: FLYOUT_SESSION_KIND.INHERIT,
      origin: undefined,
    });
  });

  it('uses the doc-viewer history key when outside the security app', () => {
    (useIsInSecurityApp as Mock).mockReturnValue(false);
    const { result } = renderHook(() => useIocFlyoutApi());
    result.current.openIocFlyout({ indicator });

    expect(mockOpenSystemFlyout.mock.calls[0][1].historyKey).toBe(DOC_VIEWER_FLYOUT_HISTORY_KEY);
  });

  it("persists the indicator's `_index` in the flyoutV2 URL descriptor so it can be restored", () => {
    const replace = vi.fn();
    useHistoryMock.mockReturnValue({ location: { search: '' }, replace });
    const indicatorWithIndex = {
      _id: 'ioc-1',
      _index: 'logs-ti_abusech_malware-latest',
      fields: { 'threat.indicator.type': ['url'] },
    } as unknown as Indicator;

    const { result } = renderHook(() => useIocFlyoutApi());
    result.current.openIocFlyout({ indicator: indicatorWithIndex });

    expect(replace).toHaveBeenCalledTimes(1);
    const { search } = replace.mock.calls[0][0];
    const encoded = new URLSearchParams(search).get('flyoutV2');
    expect(decode(encoded as string)).toEqual([
      {
        kind: 'ioc',
        indicatorId: 'ioc-1',
        indicatorIndex: 'logs-ti_abusech_malware-latest',
      },
    ]);
  });
});
