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
jest.mock('../../common/hooks/use_experimental_features');
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

describe('useDocumentFlyoutApi', () => {
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

  const getProperties = () => mockOpenSystemFlyout.mock.calls[0][1];

  it('openDocumentFlyoutFromIndex opens a system flyout with the document properties', () => {
    const { result } = renderHook(() => useDocumentFlyoutApi());
    result.current.openDocumentFlyoutFromIndex({ documentId: '1', indexName: 'index' });

    expect(flyoutProviders).toHaveBeenCalledTimes(1);
    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      'FLYOUT_CONTENT',
      expect.objectContaining({ size: 's', session: 'start', historyKey: documentFlyoutHistoryKey })
    );
    expect(mockReportEvent).toHaveBeenCalledWith(FlyoutV2EventTypes.FlyoutOpened, {
      surface: FLYOUT_SURFACE.FLYOUT,
      flyoutType: FLYOUT_TYPE.DOCUMENT,
      tool: undefined,
      session: FLYOUT_SESSION_KIND.START,
      origin: undefined,
    });
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
    expect(mockReportEvent).toHaveBeenCalledWith(FlyoutV2EventTypes.FlyoutOpened, {
      surface: FLYOUT_SURFACE.FLYOUT,
      flyoutType: FLYOUT_TYPE.DOCUMENT,
      tool: undefined,
      session: FLYOUT_SESSION_KIND.INHERIT,
      origin: undefined,
    });
  });

  it('openDocumentFlyoutFromPattern opens a system flyout with the document properties', () => {
    const { result } = renderHook(() => useDocumentFlyoutApi());
    result.current.openDocumentFlyoutFromPattern({ documentId: '1', indexName: 'logs-*,alerts-*' });

    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      'FLYOUT_CONTENT',
      expect.objectContaining({ size: 's', session: 'start' })
    );
  });

  it.each([
    ['openDocumentFlyoutFromIndex', 'start'],
    ['openDocumentFlyoutFromIndexAsChild', 'inherit'],
  ] as const)('%s forwards the given origin', (method, session) => {
    const { result } = renderHook(() => useDocumentFlyoutApi());
    result.current[method]({
      documentId: '1',
      indexName: 'index',
      origin: FLYOUT_ORIGIN.ALERTS_TABLE,
    });

    expect(mockReportEvent).toHaveBeenCalledWith(FlyoutV2EventTypes.FlyoutOpened, {
      surface: FLYOUT_SURFACE.FLYOUT,
      flyoutType: FLYOUT_TYPE.DOCUMENT,
      tool: undefined,
      session,
      origin: FLYOUT_ORIGIN.ALERTS_TABLE,
    });
  });

  it('openDocumentFlyoutFromPattern forwards the given origin', () => {
    const { result } = renderHook(() => useDocumentFlyoutApi());
    result.current.openDocumentFlyoutFromPattern({
      documentId: '1',
      indexName: 'logs-*,alerts-*',
      origin: FLYOUT_ORIGIN.NOTE_PREVIEW,
    });

    expect(mockReportEvent).toHaveBeenCalledWith(FlyoutV2EventTypes.FlyoutOpened, {
      surface: FLYOUT_SURFACE.FLYOUT,
      flyoutType: FLYOUT_TYPE.DOCUMENT,
      tool: undefined,
      session: FLYOUT_SESSION_KIND.START,
      origin: FLYOUT_ORIGIN.NOTE_PREVIEW,
    });
  });

  it('openAnalyzer opens a tools flyout as a new session', () => {
    const { result } = renderHook(() => useDocumentFlyoutApi());
    result.current.openAnalyzer({ hit });

    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      'FLYOUT_CONTENT',
      expect.objectContaining({ size: 'm', session: 'start' })
    );
    expect(mockReportEvent).toHaveBeenCalledWith(FlyoutV2EventTypes.FlyoutOpened, {
      surface: FLYOUT_SURFACE.TOOL,
      tool: FLYOUT_TOOL.ANALYZER,
      flyoutType: FLYOUT_TYPE.DOCUMENT,
      session: FLYOUT_SESSION_KIND.START,
      origin: undefined,
    });
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
    expect(children.props.value).toEqual({
      session: 'inherit',
      historyKey: documentFlyoutHistoryKey,
    });
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
    expect(children.props.value).toEqual({
      session: 'inherit',
      historyKey: documentFlyoutHistoryKey,
    });
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
    expect(children.props.value).toEqual({
      session: 'inherit',
      historyKey: documentFlyoutHistoryKey,
    });
  });

  it.each([
    ['openDocumentResponse', 'response', () => ({ hit })],
    ['openDocumentThreatIntelligence', 'threat_intelligence', () => ({ hit })],
    ['openDocumentInvestigationGuide', 'investigation_guide', () => ({ hit })],
    ['openDocumentGraph', 'graph', () => ({ hit })],
    [
      'openDocumentPrevalence',
      'prevalence',
      () => ({ hit, investigationFields: [], scopeId: '', columns: [] }),
    ],
  ] as const)('%s opens a tools flyout as a new session', (method, tool, buildParams) => {
    const { result } = renderHook(() => useDocumentFlyoutApi());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (result.current[method] as (params: any) => void)(buildParams());

    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      'FLYOUT_CONTENT',
      expect.objectContaining({ size: 'm', session: 'start' })
    );
    expect(mockReportEvent).toHaveBeenCalledWith(
      FlyoutV2EventTypes.FlyoutOpened,
      expect.objectContaining({ tool, origin: undefined })
    );
  });

  it.each([
    ['openAnalyzer', 'analyzer', 'visualizations_analyzer', () => ({ hit })],
    ['openSessionView', 'session_view', 'visualizations_session_view', () => ({ hit })],
    ['openDocumentEntities', 'entities', 'insights_entities', () => ({ hit })],
    [
      'openDocumentCorrelations',
      'correlations',
      'insights_correlations',
      () => ({ hit, scopeId: '', isRulePreview: false, onShowAlert: jest.fn() }),
    ],
    ['openDocumentResponse', 'response', 'response_section', () => ({ hit })],
    [
      'openDocumentThreatIntelligence',
      'threat_intelligence',
      'insights_threat_intel',
      () => ({ hit }),
    ],
    [
      'openDocumentInvestigationGuide',
      'investigation_guide',
      'investigation_guide',
      () => ({ hit }),
    ],
    ['openDocumentGraph', 'graph', 'visualizations_graph', () => ({ hit })],
    [
      'openDocumentPrevalence',
      'prevalence',
      'insights_prevalence',
      () => ({ hit, investigationFields: [], scopeId: '', columns: [] }),
    ],
  ] as const)('%s forwards the given origin', (method, tool, origin, buildParams) => {
    const { result } = renderHook(() => useDocumentFlyoutApi());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (result.current[method] as (params: any) => void)({ ...buildParams(), origin });

    expect(mockReportEvent).toHaveBeenCalledWith(
      FlyoutV2EventTypes.FlyoutOpened,
      expect.objectContaining({ tool, origin })
    );
  });

  it('uses the doc-viewer history key when outside the security app', () => {
    (useIsInSecurityApp as jest.Mock).mockReturnValue(false);
    const { result } = renderHook(() => useDocumentFlyoutApi());
    result.current.openAnalyzer({ hit });

    expect(getProperties().historyKey).toBe(DOC_VIEWER_FLYOUT_HISTORY_KEY);
  });
});
