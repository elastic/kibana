/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook } from '@testing-library/react';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { useRuleFlyoutApi } from './use_rule_flyout_api';
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
const ruleId = 'rule-1';

describe('useRuleFlyoutApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('openRuleFlyout opens a system flyout, defaulting to a new session', () => {
    const { result } = renderHook(() => useRuleFlyoutApi());
    result.current.openRuleFlyout({ ruleId });

    expect(flyoutProviders).toHaveBeenCalledTimes(1);
    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      'FLYOUT_CONTENT',
      expect.objectContaining({ size: 's', session: 'start', historyKey: documentFlyoutHistoryKey })
    );
    expect(mockReportEvent).toHaveBeenCalledWith(FlyoutV2EventTypes.FlyoutOpened, {
      surface: FLYOUT_SURFACE.FLYOUT,
      flyoutType: FLYOUT_TYPE.RULE,
      tool: undefined,
      session: FLYOUT_SESSION_KIND.START,
      origin: undefined,
    });
  });

  it('openRuleFlyout forwards the given origin', () => {
    const { result } = renderHook(() => useRuleFlyoutApi());
    result.current.openRuleFlyout({ ruleId, origin: FLYOUT_ORIGIN.FLYOUT_FIELD_LINK });

    expect(mockReportEvent).toHaveBeenCalledWith(FlyoutV2EventTypes.FlyoutOpened, {
      surface: FLYOUT_SURFACE.FLYOUT,
      flyoutType: FLYOUT_TYPE.RULE,
      tool: undefined,
      session: FLYOUT_SESSION_KIND.START,
      origin: FLYOUT_ORIGIN.FLYOUT_FIELD_LINK,
    });
  });

  it('openRuleFlyoutAsChild opens a system flyout that inherits the current session', () => {
    const { result } = renderHook(() => useRuleFlyoutApi());
    result.current.openRuleFlyoutAsChild({ ruleId });

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
      flyoutType: FLYOUT_TYPE.RULE,
      tool: undefined,
      session: FLYOUT_SESSION_KIND.INHERIT,
      origin: undefined,
    });
  });

  it('uses the doc-viewer history key when outside the security app', () => {
    (useIsInSecurityApp as Mock).mockReturnValue(false);
    const { result } = renderHook(() => useRuleFlyoutApi());
    result.current.openRuleFlyout({ ruleId });

    expect(mockOpenSystemFlyout.mock.calls[0][1].historyKey).toBe(DOC_VIEWER_FLYOUT_HISTORY_KEY);
  });
});
