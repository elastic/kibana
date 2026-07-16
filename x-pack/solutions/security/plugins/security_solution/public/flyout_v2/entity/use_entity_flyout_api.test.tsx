/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { useEntityFlyoutApi } from './use_entity_flyout_api';
import { useKibana } from '../../common/lib/kibana';
import { useIsInSecurityApp } from '../../common/hooks/is_in_security_app';
import { flyoutProviders } from '../shared/components/flyout_provider';
import { documentFlyoutHistoryKey } from '../shared/constants/flyout_history';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
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

describe('useEntityFlyoutApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: { overlays: { openSystemFlyout: mockOpenSystemFlyout } },
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

  it('openHostFlyoutAsChild opens a system flyout that inherits the current session', () => {
    const { result } = renderHook(() => useEntityFlyoutApi());
    result.current.openHostFlyoutAsChild({ hostName: 'host-1' });

    expect(mockOpenSystemFlyout.mock.calls[0][1].session).toBe('inherit');
  });

  it('openUserFlyout opens a system flyout as a new session with the document properties', () => {
    const { result } = renderHook(() => useEntityFlyoutApi());
    result.current.openUserFlyout({ userName: 'user-1' });

    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      'FLYOUT_CONTENT',
      expect.objectContaining({ size: 's', session: 'start', historyKey: documentFlyoutHistoryKey })
    );
  });

  it('openUserFlyoutAsChild opens a system flyout that inherits the current session', () => {
    const { result } = renderHook(() => useEntityFlyoutApi());
    result.current.openUserFlyoutAsChild({ userName: 'user-1' });

    expect(mockOpenSystemFlyout.mock.calls[0][1].session).toBe('inherit');
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

  it('uses the doc-viewer history key when outside the security app', () => {
    (useIsInSecurityApp as jest.Mock).mockReturnValue(false);
    const { result } = renderHook(() => useEntityFlyoutApi());
    result.current.openHostFlyout({ hostName: 'host-1' });

    expect(mockOpenSystemFlyout.mock.calls[0][1].historyKey).toBe(DOC_VIEWER_FLYOUT_HISTORY_KEY);
  });
});
