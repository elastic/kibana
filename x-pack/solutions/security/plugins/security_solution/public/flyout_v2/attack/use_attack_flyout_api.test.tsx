/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useAttackFlyoutApi } from './use_attack_flyout_api';
import { useKibana } from '../../common/lib/kibana';
import { useIsInSecurityApp } from '../../common/hooks/is_in_security_app';
import { flyoutProviders } from '../shared/components/flyout_provider';
import { documentFlyoutHistoryKey } from '../shared/constants/flyout_history';
import {
  FlyoutV2EventTypes,
  FLYOUT_ORIGIN,
  FLYOUT_SURFACE,
  FLYOUT_TYPE,
  FLYOUT_TOOL,
  FLYOUT_SESSION_KIND,
} from '../../common/lib/telemetry';

jest.mock('react-redux-v7', () => ({
  ...jest.requireActual('react-redux-v7'),
  useStore: jest.fn(() => ({})),
}));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: jest.fn(() => ({})),
}));
jest.mock('../../common/lib/kibana');
jest.mock('../../common/hooks/is_in_security_app');
jest.mock('../shared/components/flyout_provider', () => ({
  flyoutProviders: jest.fn(() => 'FLYOUT_CONTENT'),
}));
jest.mock('../shared/hooks/use_default_flyout_properties', () => ({
  useDefaultDocumentFlyoutProperties: jest.fn(() => ({ size: 's' })),
  defaultToolsFlyoutProperties: { size: 'm' },
}));

const mockOpenSystemFlyout = jest.fn();
const mockReportEvent = jest.fn();
const hit = { id: '1', raw: { _id: '1' }, flattened: {} } as unknown as DataTableRecord;

describe('useAttackFlyoutApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenSystemFlyout.mockReturnValue({ onClose: Promise.resolve(), close: jest.fn() });
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        overlays: { openSystemFlyout: mockOpenSystemFlyout },
        telemetry: { reportEvent: mockReportEvent },
      },
    });
    (useIsInSecurityApp as jest.Mock).mockReturnValue(true);
  });

  it('openAttackFlyout opens a system flyout as a new session with the document properties', () => {
    const { result } = renderHook(() => useAttackFlyoutApi());
    result.current.openAttackFlyout({ attackId: 'attack-1', indexName: '.alerts-security' });

    expect(flyoutProviders).toHaveBeenCalledTimes(1);
    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      'FLYOUT_CONTENT',
      expect.objectContaining({ size: 's', session: 'start', historyKey: documentFlyoutHistoryKey })
    );
    expect(mockReportEvent).toHaveBeenCalledWith(FlyoutV2EventTypes.FlyoutOpened, {
      surface: FLYOUT_SURFACE.FLYOUT,
      flyoutType: FLYOUT_TYPE.ATTACK,
      tool: undefined,
      session: FLYOUT_SESSION_KIND.START,
      origin: undefined,
    });
  });

  it('openAttackFlyout forwards the given origin', () => {
    const { result } = renderHook(() => useAttackFlyoutApi());
    result.current.openAttackFlyout({
      attackId: 'attack-1',
      indexName: '.alerts-security',
      origin: FLYOUT_ORIGIN.ATTACKS_TABLE,
    });

    expect(mockReportEvent).toHaveBeenCalledWith(FlyoutV2EventTypes.FlyoutOpened, {
      surface: FLYOUT_SURFACE.FLYOUT,
      flyoutType: FLYOUT_TYPE.ATTACK,
      tool: undefined,
      session: FLYOUT_SESSION_KIND.START,
      origin: FLYOUT_ORIGIN.ATTACKS_TABLE,
    });
  });

  it('openAttackFlyoutAsChild opens a system flyout that inherits the current session', () => {
    const { result } = renderHook(() => useAttackFlyoutApi());
    result.current.openAttackFlyoutAsChild({ attackId: 'attack-1', indexName: '.alerts-security' });

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
      flyoutType: FLYOUT_TYPE.ATTACK,
      tool: undefined,
      session: FLYOUT_SESSION_KIND.INHERIT,
      origin: undefined,
    });
  });

  it('openAttackCorrelations opens the correlations tool flyout with the tools properties and propagates inherit context to its content', () => {
    const { result } = renderHook(() => useAttackFlyoutApi());
    result.current.openAttackCorrelations({ hit, alertIds: ['alert-1'] });

    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      'FLYOUT_CONTENT',
      expect.objectContaining({ size: 'm', session: 'start', historyKey: documentFlyoutHistoryKey })
    );
    expect(mockReportEvent).toHaveBeenCalledWith(FlyoutV2EventTypes.FlyoutOpened, {
      surface: FLYOUT_SURFACE.TOOL,
      tool: FLYOUT_TOOL.CORRELATIONS,
      flyoutType: FLYOUT_TYPE.ATTACK,
      session: FLYOUT_SESSION_KIND.START,
      origin: undefined,
    });
    const { children } = (flyoutProviders as jest.Mock).mock.calls[0][0];
    expect(children.props.value).toEqual({
      session: 'inherit',
      historyKey: documentFlyoutHistoryKey,
    });
  });

  it('openAttackEntities opens the entities tool flyout with the tools properties and propagates inherit context to its content', () => {
    const { result } = renderHook(() => useAttackFlyoutApi());
    result.current.openAttackEntities({ hit, alertIds: ['alert-1'] });

    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      'FLYOUT_CONTENT',
      expect.objectContaining({ size: 'm', session: 'start', historyKey: documentFlyoutHistoryKey })
    );
    expect(mockReportEvent).toHaveBeenCalledWith(FlyoutV2EventTypes.FlyoutOpened, {
      surface: FLYOUT_SURFACE.TOOL,
      tool: FLYOUT_TOOL.ENTITIES,
      flyoutType: FLYOUT_TYPE.ATTACK,
      session: FLYOUT_SESSION_KIND.START,
      origin: undefined,
    });
    const { children } = (flyoutProviders as jest.Mock).mock.calls[0][0];
    expect(children.props.value).toEqual({
      session: 'inherit',
      historyKey: documentFlyoutHistoryKey,
    });
  });

  it('uses the doc-viewer history key when outside the security app', () => {
    (useIsInSecurityApp as jest.Mock).mockReturnValue(false);
    const { result } = renderHook(() => useAttackFlyoutApi());
    result.current.openAttackFlyout({ attackId: 'attack-1', indexName: '.alerts-security' });

    expect(mockOpenSystemFlyout.mock.calls[0][1].historyKey).toBe(DOC_VIEWER_FLYOUT_HISTORY_KEY);
  });
});
