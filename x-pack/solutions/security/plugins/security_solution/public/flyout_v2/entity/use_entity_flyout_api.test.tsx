/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { EntityType } from '../../../common/entity_analytics/types';
import { useEntityFlyoutApi } from './use_entity_flyout_api';
import { useKibana } from '../../common/lib/kibana';
import { useIsInSecurityApp } from '../../common/hooks/is_in_security_app';
import { flyoutProviders } from '../shared/components/flyout_provider';
import { documentFlyoutHistoryKey } from '../shared/constants/flyout_history';
import { buildFlyoutNavTitle } from '../shared/utils/build_flyout_nav_title';

jest.mock('../shared/utils/build_flyout_nav_title', () => ({
  buildFlyoutNavTitle: jest.fn((title: string) => `NAV:${title}`),
}));

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

describe('useEntityFlyoutApi', () => {
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

  it('openHostFlyout opens a system flyout as a new session with the document properties', () => {
    const { result } = renderHook(() => useEntityFlyoutApi());
    result.current.openHostFlyout({ hostName: 'host-1' });

    expect(flyoutProviders).toHaveBeenCalledTimes(1);
    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      'FLYOUT_CONTENT',
      expect.objectContaining({ size: 's', session: 'start', historyKey: documentFlyoutHistoryKey })
    );
  });

  it('openHostFlyout falls back to "Host: <hostName>" when no title is provided', () => {
    const { result } = renderHook(() => useEntityFlyoutApi());
    result.current.openHostFlyout({ hostName: 'host-1' });

    expect(mockOpenSystemFlyout.mock.calls[0][1].title).toBe('Host: host-1');
  });

  it('openHostFlyout uses the provided title when given', () => {
    const { result } = renderHook(() => useEntityFlyoutApi());
    result.current.openHostFlyout({ hostName: 'host-1', title: 'My Custom Host' });

    expect(mockOpenSystemFlyout.mock.calls[0][1].title).toBe('My Custom Host');
  });

  it('openHostFlyoutAsChild opens a system flyout that inherits the current session', () => {
    const { result } = renderHook(() => useEntityFlyoutApi());
    result.current.openHostFlyoutAsChild({ hostName: 'host-1' });

    expect(mockOpenSystemFlyout.mock.calls[0][1].session).toBe('inherit');
  });

  it('openHostFlyoutAsChild passes the composed nav title when a title is provided', () => {
    const { result } = renderHook(() => useEntityFlyoutApi());
    result.current.openHostFlyoutAsChild({ hostName: 'host-1', title: 'My Host' });

    expect(buildFlyoutNavTitle).toHaveBeenCalledWith('My Host');
    expect(mockOpenSystemFlyout.mock.calls[0][1].title).toBe('NAV:My Host');
  });

  it('openHostFlyoutAsChild falls back to "Host: <hostName>" when no title is provided', () => {
    const { result } = renderHook(() => useEntityFlyoutApi());
    result.current.openHostFlyoutAsChild({ hostName: 'host-1' });

    expect(buildFlyoutNavTitle).toHaveBeenCalledWith('Host: host-1');
    expect(mockOpenSystemFlyout.mock.calls[0][1].title).toBe('NAV:Host: host-1');
  });

  it('openUserFlyout opens a system flyout as a new session with the document properties', () => {
    const { result } = renderHook(() => useEntityFlyoutApi());
    result.current.openUserFlyout({ userName: 'user-1' });

    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      'FLYOUT_CONTENT',
      expect.objectContaining({ size: 's', session: 'start', historyKey: documentFlyoutHistoryKey })
    );
  });

  it('openUserFlyout falls back to "User: <userName>" when no title is provided', () => {
    const { result } = renderHook(() => useEntityFlyoutApi());
    result.current.openUserFlyout({ userName: 'user-1' });

    expect(mockOpenSystemFlyout.mock.calls[0][1].title).toBe('User: user-1');
  });

  it('openUserFlyoutAsChild opens a system flyout that inherits the current session', () => {
    const { result } = renderHook(() => useEntityFlyoutApi());
    result.current.openUserFlyoutAsChild({ userName: 'user-1' });

    expect(mockOpenSystemFlyout.mock.calls[0][1].session).toBe('inherit');
  });

  it('openUserFlyoutAsChild falls back to "User: <userName>" when no title is provided', () => {
    const { result } = renderHook(() => useEntityFlyoutApi());
    result.current.openUserFlyoutAsChild({ userName: 'user-1' });

    expect(buildFlyoutNavTitle).toHaveBeenCalledWith('User: user-1');
    expect(mockOpenSystemFlyout.mock.calls[0][1].title).toBe('NAV:User: user-1');
  });

  it('openEntityDetailsAsChild opens the matching entity flyout that inherits the current session', () => {
    const { result } = renderHook(() => useEntityFlyoutApi());
    result.current.openEntityDetailsAsChild({
      engineType: 'host',
      entityId: 'entity-1',
      entityName: 'host-1',
      scopeId: 'scopeId',
    });

    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      'FLYOUT_CONTENT',
      expect.objectContaining({ size: 's', session: 'inherit' })
    );
  });

  it('openEntityDetailsAsChild composes the nav title from the entity name', () => {
    const { result } = renderHook(() => useEntityFlyoutApi());
    result.current.openEntityDetailsAsChild({
      engineType: 'host',
      entityId: 'entity-1',
      entityName: 'host-1',
      scopeId: 'scopeId',
    });

    expect(buildFlyoutNavTitle).toHaveBeenCalledWith('host-1');
    expect(mockOpenSystemFlyout.mock.calls[0][1].title).toBe('NAV:host-1');
  });

  it('openEntityDetailsAsChild falls back to entityId when entityName is absent', () => {
    const { result } = renderHook(() => useEntityFlyoutApi());
    result.current.openEntityDetailsAsChild({
      engineType: 'host',
      entityId: 'entity-1',
      entityName: undefined,
      scopeId: 'scopeId',
    });

    expect(buildFlyoutNavTitle).toHaveBeenCalledWith('entity-1');
  });

  it.each([
    'openEntityRiskInputs',
    'openEntityAnomalyInsights',
    'openEntityAlertsInsights',
    'openEntityMisconfigurationInsights',
    'openEntityVulnerabilityInsights',
    'openEntityGraphView',
    'openEntityResolution',
    'openEntityEntraInsights',
    'openEntityOktaInsights',
    'openEntityFieldsTable',
  ] as const)('%s opens a tools flyout as a new session', (method) => {
    const { result } = renderHook(() => useEntityFlyoutApi());
    // The tool params differ per method; the hook only spreads them onto the (unrendered, mocked)
    // component, so a permissive object is fine for asserting the flyout properties.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (result.current[method] as (params: any) => void)({
      entityType: 'host',
      value: 'x',
      entityName: 'x',
      hostName: 'x',
      entityId: 'entity-1',
      scopeId: '',
      document: {},
      managedUser: {},
    });

    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      'FLYOUT_CONTENT',
      expect.objectContaining({ size: 'm', session: 'start' })
    );
  });

  it('openEntityAlertsInsights auto-generates "Alerts: <value>" title when none is provided', () => {
    const { result } = renderHook(() => useEntityFlyoutApi());
    result.current.openEntityAlertsInsights({ entityType: EntityType.host, value: 'my-host' });

    expect(mockOpenSystemFlyout.mock.calls[0][1].title).toBe('Alerts: my-host');
  });

  it('openEntityAlertsInsights uses the caller-provided title when given', () => {
    const { result } = renderHook(() => useEntityFlyoutApi());
    result.current.openEntityAlertsInsights({
      entityType: EntityType.host,
      value: 'my-host',
      title: 'Custom',
    });

    expect(mockOpenSystemFlyout.mock.calls[0][1].title).toBe('Custom');
  });

  it('openEntityRiskInputs auto-generates "Risk score: <entityName>" title when none is provided', () => {
    const { result } = renderHook(() => useEntityFlyoutApi());
    result.current.openEntityRiskInputs({ entityType: EntityType.host, entityName: 'my-host' });

    expect(mockOpenSystemFlyout.mock.calls[0][1].title).toBe('Risk score: my-host');
  });

  it('uses the doc-viewer history key when outside the security app', () => {
    (useIsInSecurityApp as jest.Mock).mockReturnValue(false);
    const { result } = renderHook(() => useEntityFlyoutApi());
    result.current.openHostFlyout({ hostName: 'host-1' });

    expect(mockOpenSystemFlyout.mock.calls[0][1].historyKey).toBe(DOC_VIEWER_FLYOUT_HISTORY_KEY);
  });
});
