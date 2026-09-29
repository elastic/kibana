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
import { FLYOUT_DESCRIPTOR_KIND } from '../shared/url_state/flyout_v2_url_param';

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
      useDefaultToolsFlyoutProperties: vi.fn(() => ({ minWidth: 384, size: 'm' })),
    };
      return { ...mocked, default: mocked };
    });

const mockWriteOnOpen = vi.fn();
const mockBuildOnClose = vi.fn(() => vi.fn());
vi.mock('../shared/url_state/flyout_v2_url_writer', () => {
      const mocked = {
      useFlyoutV2UrlWriter: vi.fn(() => ({
        writeOnOpen: mockWriteOnOpen,
        buildOnClose: mockBuildOnClose,
      })),
    };
      return { ...mocked, default: mocked };
    });

const mockOpenSystemFlyout = vi.fn();
const mockReportEvent = vi.fn();
const hit = {
  id: '1',
  raw: { _id: 'attack-id', _index: 'attack-index' },
  flattened: {},
} as unknown as DataTableRecord;

describe('useAttackFlyoutApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOpenSystemFlyout.mockReturnValue({ onClose: Promise.resolve(), close: vi.fn() });
    mockBuildOnClose.mockReturnValue(vi.fn());
    (useKibana as Mock).mockReturnValue({
      services: {
        overlays: { openSystemFlyout: mockOpenSystemFlyout },
        storage: { get: vi.fn(), set: vi.fn(), remove: vi.fn() },
        telemetry: { reportEvent: mockReportEvent },
      },
    });
    (useIsInSecurityApp as Mock).mockReturnValue(true);
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

  it('openAttackFlyout writes an attack descriptor to the URL', () => {
    const { result } = renderHook(() => useAttackFlyoutApi());
    result.current.openAttackFlyout({ attackId: 'attack-1', indexName: '.alerts-security' });

    expect(mockWriteOnOpen).toHaveBeenCalledWith({
      kind: FLYOUT_DESCRIPTOR_KIND.attack,
      attackId: 'attack-1',
      indexName: '.alerts-security',
    });
    expect(mockBuildOnClose).toHaveBeenCalledWith(null);
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

  it('openAttackFlyoutAsChild writes an attack descriptor in inherit mode', () => {
    const { result } = renderHook(() => useAttackFlyoutApi());
    result.current.openAttackFlyoutAsChild({ attackId: 'attack-1', indexName: '.alerts-security' });

    expect(mockWriteOnOpen).toHaveBeenCalledWith(
      { kind: FLYOUT_DESCRIPTOR_KIND.attack, attackId: 'attack-1', indexName: '.alerts-security' },
      'inherit'
    );
    // buildOnClose is called with null (no prior URL state in this test environment)
    expect(mockBuildOnClose).toHaveBeenCalledWith(null);
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
    const { children } = (flyoutProviders as Mock).mock.calls[0][0];
    expect(children.props.value).toEqual({
      session: 'inherit',
      historyKey: documentFlyoutHistoryKey,
      isChildFlyout: false,
    });
  });

  it('openAttackCorrelations writes an attackCorrelations descriptor and clears the param on close', () => {
    const { result } = renderHook(() => useAttackFlyoutApi());
    result.current.openAttackCorrelations({ hit, alertIds: ['alert-1', 'alert-2'] });

    expect(mockWriteOnOpen).toHaveBeenCalledWith({
      kind: FLYOUT_DESCRIPTOR_KIND.attackCorrelations,
      attackId: 'attack-id',
      indexName: 'attack-index',
      alertIds: ['alert-1', 'alert-2'],
    });
    // A tool is a session:'start' root; closing it clears the param (no parent to revert to).
    expect(mockBuildOnClose).toHaveBeenCalledWith(null);
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
    const { children } = (flyoutProviders as Mock).mock.calls[0][0];
    expect(children.props.value).toEqual({
      session: 'inherit',
      historyKey: documentFlyoutHistoryKey,
      isChildFlyout: false,
    });
  });

  it('openAttackEntities writes an attackEntities descriptor and clears the param on close', () => {
    const { result } = renderHook(() => useAttackFlyoutApi());
    result.current.openAttackEntities({ hit, alertIds: ['alert-1', 'alert-2'] });

    expect(mockWriteOnOpen).toHaveBeenCalledWith({
      kind: FLYOUT_DESCRIPTOR_KIND.attackEntities,
      attackId: 'attack-id',
      indexName: 'attack-index',
      alertIds: ['alert-1', 'alert-2'],
    });
    // A tool is a session:'start' root; closing it clears the param (no parent to revert to).
    expect(mockBuildOnClose).toHaveBeenCalledWith(null);
  });

  it('uses the doc-viewer history key when outside the security app', () => {
    (useIsInSecurityApp as Mock).mockReturnValue(false);
    const { result } = renderHook(() => useAttackFlyoutApi());
    result.current.openAttackFlyout({ attackId: 'attack-1', indexName: '.alerts-security' });

    expect(mockOpenSystemFlyout.mock.calls[0][1].historyKey).toBe(DOC_VIEWER_FLYOUT_HISTORY_KEY);
  });
});
