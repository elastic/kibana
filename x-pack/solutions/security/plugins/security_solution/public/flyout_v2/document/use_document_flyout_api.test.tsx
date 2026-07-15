/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { useDocumentFlyoutApi } from './use_document_flyout_api';
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
jest.mock('../../common/hooks/use_experimental_features');
jest.mock('../shared/components/flyout_provider', () => ({
  flyoutProviders: jest.fn(() => 'FLYOUT_CONTENT'),
}));
jest.mock('../shared/hooks/use_default_flyout_properties', () => ({
  useDefaultDocumentFlyoutProperties: jest.fn(() => ({ size: 's' })),
  defaultToolsFlyoutProperties: { size: 'm' },
}));

const mockOpenSystemFlyout = jest.fn();
const hit = { id: '1', raw: { _id: '1' }, flattened: {} } as unknown as DataTableRecord;

describe('useDocumentFlyoutApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: { overlays: { openSystemFlyout: mockOpenSystemFlyout } },
    });
    (useIsInSecurityApp as jest.Mock).mockReturnValue(true);
  });

  const getProperties = () => mockOpenSystemFlyout.mock.calls[0][1];

  it('openDocumentFlyoutFromIndex opens a system flyout with the document properties', () => {
    const { result } = renderHook(() => useDocumentFlyoutApi());
    result.current.openDocumentFlyoutFromIndex({ documentId: '1', indexName: 'index' });

    expect(flyoutProviders).toHaveBeenCalledTimes(1);
    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      'FLYOUT_CONTENT',
      expect.objectContaining({ size: 's', session: 'start', historyKey: documentFlyoutHistoryKey })
    );
  });

  it('openDocumentFlyoutFromIndexAsChild opens a system flyout that inherits the current session', () => {
    const { result } = renderHook(() => useDocumentFlyoutApi());
    result.current.openDocumentFlyoutFromIndexAsChild({ documentId: '1', indexName: 'index' });

    expect(flyoutProviders).toHaveBeenCalledTimes(1);
    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      'FLYOUT_CONTENT',
      expect.objectContaining({
        size: 's',
        session: 'inherit',
        historyKey: documentFlyoutHistoryKey,
      })
    );
  });

  it('openDocumentFlyoutFromPattern opens a system flyout with the document properties', () => {
    const { result } = renderHook(() => useDocumentFlyoutApi());
    result.current.openDocumentFlyoutFromPattern({ documentId: '1', indexName: 'logs-*,alerts-*' });

    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      'FLYOUT_CONTENT',
      expect.objectContaining({ size: 's', session: 'start' })
    );
  });

  it('openAnalyzer opens a tools flyout as a new session', () => {
    const { result } = renderHook(() => useDocumentFlyoutApi());
    result.current.openAnalyzer({ hit });

    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      'FLYOUT_CONTENT',
      expect.objectContaining({ size: 'm', session: 'start' })
    );
  });

  it('openSessionView opens a tools flyout as a new session', () => {
    const { result } = renderHook(() => useDocumentFlyoutApi());
    result.current.openSessionView({ hit });

    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      'FLYOUT_CONTENT',
      expect.objectContaining({ size: 'm', session: 'start' })
    );
  });

  it('openDocumentEntities opens a tools flyout as a new session and propagates inherit context to its content', () => {
    const { result } = renderHook(() => useDocumentFlyoutApi());
    result.current.openDocumentEntities({ hit });

    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      'FLYOUT_CONTENT',
      expect.objectContaining({ size: 'm', session: 'start' })
    );
    const { children } = (flyoutProviders as jest.Mock).mock.calls[0][0];
    expect(children.props.value).toBe('inherit');
  });

  it('openDocumentCorrelations opens a tools flyout as a new session and propagates inherit context to its content', () => {
    const { result } = renderHook(() => useDocumentFlyoutApi());
    result.current.openDocumentCorrelations({
      hit,
      scopeId: '',
      isRulePreview: false,
      onShowAlert: jest.fn(),
    });

    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      'FLYOUT_CONTENT',
      expect.objectContaining({ size: 'm', session: 'start' })
    );
    const { children } = (flyoutProviders as jest.Mock).mock.calls[0][0];
    expect(children.props.value).toBe('inherit');
  });

  it('openDocumentPrevalence opens a tools flyout as a new session and propagates inherit context to its content', () => {
    const { result } = renderHook(() => useDocumentFlyoutApi());
    result.current.openDocumentPrevalence({
      hit,
      investigationFields: [],
      scopeId: '',
      columns: [],
    });

    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      'FLYOUT_CONTENT',
      expect.objectContaining({ size: 'm', session: 'start' })
    );
    const { children } = (flyoutProviders as jest.Mock).mock.calls[0][0];
    expect(children.props.value).toBe('inherit');
  });

  it.each([
    ['openDocumentResponse', () => ({ hit })],
    ['openDocumentThreatIntelligence', () => ({ hit })],
    ['openDocumentInvestigationGuide', () => ({ hit })],
    ['openDocumentGraph', () => ({ hit })],
  ] as const)('%s opens a tools flyout as a new session', (method, buildParams) => {
    const { result } = renderHook(() => useDocumentFlyoutApi());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (result.current[method] as (params: any) => void)(buildParams());

    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      'FLYOUT_CONTENT',
      expect.objectContaining({ size: 'm', session: 'start' })
    );
  });

  it('uses the doc-viewer history key when outside the security app', () => {
    (useIsInSecurityApp as jest.Mock).mockReturnValue(false);
    const { result } = renderHook(() => useDocumentFlyoutApi());
    result.current.openAnalyzer({ hit });

    expect(getProperties().historyKey).toBe(DOC_VIEWER_FLYOUT_HISTORY_KEY);
  });
});
