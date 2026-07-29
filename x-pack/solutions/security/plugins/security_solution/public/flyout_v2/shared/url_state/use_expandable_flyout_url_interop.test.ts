/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { encode } from '@kbn/rison';
import {
  translateLegacyStateToDescriptors,
  useLegacyFlyoutUrlInterop,
} from './use_expandable_flyout_url_interop';
import { useFlyoutApi } from '../../use_flyout_api';
import { createFlyoutApiMock } from '../../use_flyout_api.mock';
import { ElasticRequestState } from '@kbn/unified-doc-viewer';
import { useEsDocSearch } from '@kbn/unified-doc-viewer-plugin/public';
import { useIsNewFlyoutEnabled } from '../../../common/hooks/use_is_new_flyout_enabled';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { PageScope } from '../../../data_view_manager/constants';
import { FLYOUT_V2_URL_PARAM } from './flyout_v2_url_param';

// Import the renderHook + Router helpers
import React from 'react';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../../use_flyout_api');
jest.mock('../../../common/hooks/use_is_new_flyout_enabled');
jest.mock('@kbn/unified-doc-viewer-plugin/public', () => ({
  useEsDocSearch: jest.fn(),
}));
jest.mock('../../../data_view_manager/hooks/use_data_view');

const mockFlyoutApi = createFlyoutApiMock();
(useFlyoutApi as jest.Mock).mockReturnValue(mockFlyoutApi);
(useIsNewFlyoutEnabled as jest.Mock).mockReturnValue(true);

const mockDataView = { getRuntimeMappings: jest.fn(() => ({})) };
(useDataView as jest.Mock).mockReturnValue({ dataView: mockDataView, status: 'ready' });

const noHit = () =>
  (useEsDocSearch as jest.Mock).mockReturnValue([ElasticRequestState.NotFound, null, jest.fn()]);

const withHit = (record: Record<string, unknown>) =>
  (useEsDocSearch as jest.Mock).mockReturnValue([ElasticRequestState.Found, record, jest.fn()]);

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const LEGACY_PARAM = 'flyout';
const V2_PARAM = FLYOUT_V2_URL_PARAM;

const buildLegacyUrl = (state: object) => `/?${LEGACY_PARAM}=${encode(state)}`;

const renderInterop = (url: string) => {
  const history = createMemoryHistory({ initialEntries: [url] });
  const wrapper: React.FC<{ children?: React.ReactNode }> = ({ children }) =>
    React.createElement(Router, { history }, children as React.ReactElement);
  const { result, rerender } = renderHook(() => useLegacyFlyoutUrlInterop(LEGACY_PARAM, V2_PARAM), {
    wrapper,
  });
  return { result, history, rerender };
};

// ---------------------------------------------------------------------------
// Unit tests: translateLegacyStateToDescriptors
// ---------------------------------------------------------------------------

describe('translateLegacyStateToDescriptors', () => {
  describe('no-tools panel types (right+left → single main)', () => {
    it('network: right only → single network descriptor', () => {
      const result = translateLegacyStateToDescriptors({
        right: { id: 'network-details', params: { ip: '1.2.3.4', flowTarget: 'source' } },
      });
      expect(result).toEqual([{ kind: 'network', ip: '1.2.3.4', flowTarget: 'source' }]);
    });

    it('network: right+left collapses to single network descriptor', () => {
      const result = translateLegacyStateToDescriptors({
        right: { id: 'network-details', params: { ip: '10.0.0.1', flowTarget: 'destination' } },
        left: { id: 'some-network-left', params: {} },
      });
      expect(result).toEqual([{ kind: 'network', ip: '10.0.0.1', flowTarget: 'destination' }]);
    });

    it('rule: right only → single rule descriptor', () => {
      const result = translateLegacyStateToDescriptors({
        right: { id: 'rule-panel', params: { ruleId: 'rule-123' } },
      });
      expect(result).toEqual([{ kind: 'rule', ruleId: 'rule-123' }]);
    });

    it('CSP misconfiguration: right only → single cspMisconfiguration descriptor', () => {
      const result = translateLegacyStateToDescriptors({
        right: {
          id: 'findings-misconfiguration-panel',
          params: { resourceId: 'res-1', ruleId: 'csp-rule-1' },
        },
      });
      expect(result).toEqual([
        { kind: 'cspMisconfiguration', resourceId: 'res-1', ruleId: 'csp-rule-1' },
      ]);
    });

    it('CSP vulnerability: right only → single cspVulnerability descriptor', () => {
      const result = translateLegacyStateToDescriptors({
        right: {
          id: 'findings-vulnerability-panel',
          params: { vulnerabilityId: 'CVE-1', resourceId: 'res-2' },
        },
      });
      expect(result).toEqual([
        {
          kind: 'cspVulnerability',
          vulnerabilityId: 'CVE-1',
          resourceId: 'res-2',
          packageName: undefined,
          packageVersion: undefined,
          eventId: undefined,
        },
      ]);
    });
  });

  describe('document flyout', () => {
    it('right only → single document descriptor', () => {
      const result = translateLegacyStateToDescriptors({
        right: {
          id: 'document-details-right',
          params: { id: 'doc-1', indexName: 'logs-*', scopeId: 'alerts' },
        },
      });
      expect(result).toEqual([{ kind: 'document', documentId: 'doc-1', indexName: 'logs-*' }]);
    });

    it('right+left (visualize/analyze_graph) → [analyzer, document]', () => {
      const result = translateLegacyStateToDescriptors({
        right: {
          id: 'document-details-right',
          params: { id: 'doc-1', indexName: 'logs-*', scopeId: 'alerts' },
        },
        left: { id: 'document-details-left', path: { tab: 'visualize', subTab: 'analyze_graph' } },
      });
      expect(result).toEqual([
        { kind: 'analyzer', documentId: 'doc-1', indexName: 'logs-*' },
        { kind: 'document', documentId: 'doc-1', indexName: 'logs-*' },
      ]);
    });

    it('right+left (visualize/session-view) → [sessionView, document]', () => {
      const result = translateLegacyStateToDescriptors({
        right: {
          id: 'document-details-right',
          params: { id: 'doc-2', indexName: 'idx', scopeId: 'sc' },
        },
        left: { id: 'document-details-left', path: { tab: 'visualize', subTab: 'session-view' } },
      });
      expect(result).toEqual([
        { kind: 'sessionView', documentId: 'doc-2', indexName: 'idx' },
        { kind: 'document', documentId: 'doc-2', indexName: 'idx' },
      ]);
    });

    it('right+left (visualize/graph-visualization) → [documentGraph, document]', () => {
      const result = translateLegacyStateToDescriptors({
        right: {
          id: 'document-details-right',
          params: { id: 'doc-3', indexName: 'idx', scopeId: 'sc' },
        },
        left: {
          id: 'document-details-left',
          path: { tab: 'visualize', subTab: 'graph-visualization' },
        },
      });
      expect(result).toEqual([
        { kind: 'documentGraph', documentId: 'doc-3', indexName: 'idx' },
        { kind: 'document', documentId: 'doc-3', indexName: 'idx' },
      ]);
    });

    it('right+left (insights/entity) → [documentEntities, document]', () => {
      const result = translateLegacyStateToDescriptors({
        right: {
          id: 'document-details-right',
          params: { id: 'doc-4', indexName: 'idx', scopeId: 'sc' },
        },
        left: { id: 'document-details-left', path: { tab: 'insights', subTab: 'entity' } },
      });
      expect(result).toEqual([
        { kind: 'documentEntities', documentId: 'doc-4', indexName: 'idx', scopeId: 'sc' },
        { kind: 'document', documentId: 'doc-4', indexName: 'idx' },
      ]);
    });

    it('right+left (insights/threatIntelligence) → [documentThreatIntelligence, document]', () => {
      const result = translateLegacyStateToDescriptors({
        right: {
          id: 'document-details-right',
          params: { id: 'doc-5', indexName: 'idx', scopeId: 'sc' },
        },
        left: {
          id: 'document-details-left',
          path: { tab: 'insights', subTab: 'threatIntelligence' },
        },
      });
      expect(result).toEqual([
        { kind: 'documentThreatIntelligence', documentId: 'doc-5', indexName: 'idx' },
        { kind: 'document', documentId: 'doc-5', indexName: 'idx' },
      ]);
    });

    it('right+left (insights/prevalence) → [documentPrevalence, document]', () => {
      const result = translateLegacyStateToDescriptors({
        right: {
          id: 'document-details-right',
          params: { id: 'doc-6', indexName: 'idx', scopeId: 'sc' },
        },
        left: { id: 'document-details-left', path: { tab: 'insights', subTab: 'prevalence' } },
      });
      expect(result).toEqual([
        {
          kind: 'documentPrevalence',
          documentId: 'doc-6',
          indexName: 'idx',
          scopeId: 'sc',
          investigationFields: [],
        },
        { kind: 'document', documentId: 'doc-6', indexName: 'idx' },
      ]);
    });

    it('right+left (insights/correlations) → [documentCorrelations, document]', () => {
      const result = translateLegacyStateToDescriptors({
        right: {
          id: 'document-details-right',
          params: { id: 'doc-7', indexName: 'idx', scopeId: 'sc' },
        },
        left: { id: 'document-details-left', path: { tab: 'insights', subTab: 'correlations' } },
      });
      expect(result).toEqual([
        {
          kind: 'documentCorrelations',
          documentId: 'doc-7',
          indexName: 'idx',
          scopeId: 'sc',
          isRulePreview: false,
        },
        { kind: 'document', documentId: 'doc-7', indexName: 'idx' },
      ]);
    });

    it('right+left (investigation) → [documentInvestigationGuide, document]', () => {
      const result = translateLegacyStateToDescriptors({
        right: {
          id: 'document-details-right',
          params: { id: 'doc-8', indexName: 'idx', scopeId: 'sc' },
        },
        left: { id: 'document-details-left', path: { tab: 'investigation' } },
      });
      expect(result).toEqual([
        { kind: 'documentInvestigationGuide', documentId: 'doc-8', indexName: 'idx' },
        { kind: 'document', documentId: 'doc-8', indexName: 'idx' },
      ]);
    });

    it('right+left (response) → [documentResponse, document]', () => {
      const result = translateLegacyStateToDescriptors({
        right: {
          id: 'document-details-right',
          params: { id: 'doc-9', indexName: 'idx', scopeId: 'sc' },
        },
        left: { id: 'document-details-left', path: { tab: 'response' } },
      });
      expect(result).toEqual([
        { kind: 'documentResponse', documentId: 'doc-9', indexName: 'idx' },
        { kind: 'document', documentId: 'doc-9', indexName: 'idx' },
      ]);
    });

    it('right+left (notes) → [notes, document]', () => {
      const result = translateLegacyStateToDescriptors({
        right: {
          id: 'document-details-right',
          params: { id: 'doc-10', indexName: 'idx', scopeId: 'sc' },
        },
        left: { id: 'document-details-left', path: { tab: 'notes' } },
      });
      expect(result).toEqual([
        { kind: 'notes', documentId: 'doc-10', indexName: 'idx' },
        { kind: 'document', documentId: 'doc-10', indexName: 'idx' },
      ]);
    });

    it('right+left+preview → [tool, preview-descriptor] (preview wins over right)', () => {
      const result = translateLegacyStateToDescriptors({
        right: {
          id: 'document-details-right',
          params: { id: 'doc-1', indexName: 'idx', scopeId: 'sc' },
        },
        left: { id: 'document-details-left', path: { tab: 'visualize', subTab: 'analyze_graph' } },
        preview: [
          {
            id: 'document-details-preview',
            params: { id: 'preview-doc', indexName: 'preview-idx' },
          },
        ],
      });
      expect(result).toEqual([
        { kind: 'analyzer', documentId: 'doc-1', indexName: 'idx' },
        { kind: 'document', documentId: 'preview-doc', indexName: 'preview-idx' },
      ]);
    });

    it('right+left with unknown left tab → [document] (fallback to main)', () => {
      const result = translateLegacyStateToDescriptors({
        right: {
          id: 'document-details-right',
          params: { id: 'doc-1', indexName: 'idx', scopeId: 'sc' },
        },
        left: { id: 'document-details-left', path: { tab: 'unknown-tab' } },
      });
      expect(result).toEqual([{ kind: 'document', documentId: 'doc-1', indexName: 'idx' }]);
    });
  });

  describe('attack flyout', () => {
    it('right only → single attack descriptor', () => {
      const result = translateLegacyStateToDescriptors({
        right: { id: 'attack-details-right', params: { attackId: 'atk-1', indexName: 'idx' } },
      });
      expect(result).toEqual([{ kind: 'attack', attackId: 'atk-1', indexName: 'idx' }]);
    });

    it('right+left (insights/entity) → [attackEntities, attack]', () => {
      const result = translateLegacyStateToDescriptors({
        right: { id: 'attack-details-right', params: { attackId: 'atk-2', indexName: 'idx' } },
        left: { id: 'attack-details-left', path: { tab: 'insights', subTab: 'entity' } },
      });
      expect(result).toEqual([
        { kind: 'attackEntities', attackId: 'atk-2', indexName: 'idx', alertIds: [] },
        { kind: 'attack', attackId: 'atk-2', indexName: 'idx' },
      ]);
    });

    it('right+left (insights/correlation) → [attackCorrelations, attack]', () => {
      const result = translateLegacyStateToDescriptors({
        right: { id: 'attack-details-right', params: { attackId: 'atk-3', indexName: 'idx' } },
        left: { id: 'attack-details-left', path: { tab: 'insights', subTab: 'correlation' } },
      });
      expect(result).toEqual([
        { kind: 'attackCorrelations', attackId: 'atk-3', indexName: 'idx', alertIds: [] },
        { kind: 'attack', attackId: 'atk-3', indexName: 'idx' },
      ]);
    });
  });

  describe('entity flyouts', () => {
    it('host right only → single host descriptor', () => {
      const result = translateLegacyStateToDescriptors({
        right: {
          id: 'host-panel',
          params: { hostName: 'my-host', entityId: 'eid-1', scopeId: 'alerts' },
        },
      });
      expect(result).toEqual([
        { kind: 'host', hostName: 'my-host', entityId: 'eid-1', scopeId: 'alerts' },
      ]);
    });

    it('host right+left (risk_inputs) → [entityRiskInputs, host]', () => {
      const result = translateLegacyStateToDescriptors({
        right: {
          id: 'host-panel',
          params: { hostName: 'my-host', entityId: 'eid-1', scopeId: 'alerts' },
        },
        left: { id: 'host_details', path: { tab: 'risk_inputs' } },
      });
      expect(result).toEqual([
        { kind: 'entityRiskInputs', entityType: 'host', entityName: 'my-host', entityId: 'eid-1' },
        { kind: 'host', hostName: 'my-host', entityId: 'eid-1', scopeId: 'alerts' },
      ]);
    });

    it('host right+left (graph_view) → [entityGraphView, host]', () => {
      const result = translateLegacyStateToDescriptors({
        right: {
          id: 'host-panel',
          params: { hostName: 'my-host', entityId: 'eid-1', scopeId: 'alerts' },
        },
        left: { id: 'host_details', path: { tab: 'graph_view' } },
      });
      expect(result).toEqual([
        { kind: 'entityGraphView', entityId: 'eid-1', scopeId: 'alerts', entityName: 'my-host' },
        { kind: 'host', hostName: 'my-host', entityId: 'eid-1', scopeId: 'alerts' },
      ]);
    });

    it('host right+left (csp_insights/misconfigurationTabId) → [entityMisconfigurationInsights, host]', () => {
      const result = translateLegacyStateToDescriptors({
        right: {
          id: 'host-panel',
          params: { hostName: 'my-host', entityId: 'eid-1', scopeId: 'alerts' },
        },
        left: {
          id: 'host_details',
          path: { tab: 'csp_insights', subTab: 'misconfigurationTabId' },
        },
      });
      expect(result).toEqual([
        {
          kind: 'entityMisconfigurationInsights',
          entityType: 'host',
          value: 'my-host',
          entityId: 'eid-1',
        },
        { kind: 'host', hostName: 'my-host', entityId: 'eid-1', scopeId: 'alerts' },
      ]);
    });

    it('user right+left (risk_inputs) → [entityRiskInputs, user]', () => {
      const result = translateLegacyStateToDescriptors({
        right: { id: 'user-panel', params: { userName: 'bob', entityId: 'u-1', scopeId: 'sc' } },
        left: { id: 'user_details', path: { tab: 'risk_inputs' } },
      });
      expect(result).toEqual([
        { kind: 'entityRiskInputs', entityType: 'user', entityName: 'bob', entityId: 'u-1' },
        { kind: 'user', userName: 'bob', entityId: 'u-1', scopeId: 'sc' },
      ]);
    });

    it('service right+left (anomalies) → [entityAnomalyInsights, service]', () => {
      const result = translateLegacyStateToDescriptors({
        right: {
          id: 'service-panel',
          params: { serviceName: 'svc-a', entityId: 's-1', scopeId: 'sc' },
        },
        left: { id: 'service_details', path: { tab: 'anomalies' } },
      });
      expect(result).toEqual([
        { kind: 'entityAnomalyInsights', entityType: 'service', value: 'svc-a', entityId: 's-1' },
        { kind: 'service', serviceName: 'svc-a', entityId: 's-1', scopeId: 'sc' },
      ]);
    });

    it('entity right+left (okta_document) → [host] (unmappable — fallback to main)', () => {
      const result = translateLegacyStateToDescriptors({
        right: {
          id: 'host-panel',
          params: { hostName: 'my-host', entityId: 'eid-1', scopeId: 'sc' },
        },
        left: { id: 'host_details', path: { tab: 'okta_document' } },
      });
      // Okta/Entra need managed user data — fall back to main
      expect(result).toEqual([
        { kind: 'host', hostName: 'my-host', entityId: 'eid-1', scopeId: 'sc' },
      ]);
    });
  });

  describe('IOC flyout', () => {
    it('ioc right → null (indicatorIndex missing from legacy params)', () => {
      const result = translateLegacyStateToDescriptors({
        right: { id: 'ioc-details-right', params: { id: 'ioc-1' } },
      });
      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('no right panel → null', () => {
      expect(translateLegacyStateToDescriptors({ left: { id: 'anything' } })).toBeNull();
    });

    it('unknown right panel id → null', () => {
      const result = translateLegacyStateToDescriptors({
        right: { id: 'unknown-panel-xyz', params: {} },
      });
      expect(result).toBeNull();
    });

    it('right panel missing required params → null', () => {
      expect(
        translateLegacyStateToDescriptors({ right: { id: 'document-details-right', params: {} } })
      ).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// Integration tests: useLegacyFlyoutUrlInterop hook
// ---------------------------------------------------------------------------

describe('useLegacyFlyoutUrlInterop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useFlyoutApi as jest.Mock).mockReturnValue(mockFlyoutApi);
    (useIsNewFlyoutEnabled as jest.Mock).mockReturnValue(true);
    (useDataView as jest.Mock).mockReturnValue({ dataView: mockDataView, status: 'ready' });
    noHit();
  });

  it('does nothing when new flyout is disabled', async () => {
    (useIsNewFlyoutEnabled as jest.Mock).mockReturnValue(false);
    const legacyState = {
      right: {
        id: 'document-details-right',
        params: { id: 'doc-1', indexName: 'idx', scopeId: 'sc' },
      },
    };
    const { history } = renderInterop(buildLegacyUrl(legacyState));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockFlyoutApi.openDocumentFlyoutFromIndex).not.toHaveBeenCalled();
    // Legacy param should still be present
    expect(new URLSearchParams(history.location.search).get(LEGACY_PARAM)).toBeTruthy();
  });

  it('does nothing when the v2 param is already present', async () => {
    const legacyState = {
      right: {
        id: 'document-details-right',
        params: { id: 'doc-1', indexName: 'idx', scopeId: 'sc' },
      },
    };
    const legacyRison = encode(legacyState);
    const v2Rison = encode([{ kind: 'document', documentId: 'doc-1', indexName: 'idx' }]);
    const url = `/?${LEGACY_PARAM}=${legacyRison}&${V2_PARAM}=${v2Rison}`;

    const history = createMemoryHistory({ initialEntries: [url] });
    const wrapper: React.FC<{ children?: React.ReactNode }> = ({ children }) =>
      React.createElement(Router, { history }, children as React.ReactElement);
    renderHook(() => useLegacyFlyoutUrlInterop(LEGACY_PARAM, V2_PARAM), { wrapper });

    await act(async () => {
      await Promise.resolve();
    });
    expect(mockFlyoutApi.openDocumentFlyoutFromIndex).not.toHaveBeenCalled();
  });

  it('strips malformed legacy param and opens nothing', async () => {
    const url = `/?${LEGACY_PARAM}=not-valid-rison!!!`;
    const { history } = renderInterop(url);

    await act(async () => {
      await Promise.resolve();
    });

    // Param should be stripped
    expect(new URLSearchParams(history.location.search).get(LEGACY_PARAM)).toBeNull();
    expect(mockFlyoutApi.openDocumentFlyoutFromIndex).not.toHaveBeenCalled();
  });

  it('opens a document main flyout for right-only document legacy URL', async () => {
    const legacyState = {
      right: {
        id: 'document-details-right',
        params: { id: 'doc-1', indexName: 'logs-*', scopeId: 'sc' },
      },
    };
    const { history } = renderInterop(buildLegacyUrl(legacyState));

    await act(async () => {
      // Advance timers to let setTimeout(0) fire
      jest.runAllTimers();
      await Promise.resolve();
    });

    // Legacy param removed
    expect(new URLSearchParams(history.location.search).get(LEGACY_PARAM)).toBeNull();
  });

  it('opens tool + child for document right+left URL', async () => {
    const legacyState = {
      right: {
        id: 'document-details-right',
        params: { id: 'doc-1', indexName: 'idx', scopeId: 'sc' },
      },
      left: { id: 'document-details-left', path: { tab: 'investigation' } },
    };
    // documentInvestigationGuide needs a hit — provide one (useEsDocSearch returns a record)
    withHit({ id: 'doc-1', raw: { _id: 'doc-1', _index: 'idx', fields: {} }, flattened: {} });

    const { history } = renderInterop(buildLegacyUrl(legacyState));

    await act(async () => {
      jest.runAllTimers();
      await Promise.resolve();
    });

    // Legacy param removed
    expect(new URLSearchParams(history.location.search).get(LEGACY_PARAM)).toBeNull();
  });

  it('opens a host flyout for host right-only legacy URL', async () => {
    const legacyState = {
      right: {
        id: 'host-panel',
        params: { hostName: 'my-host', entityId: 'eid', scopeId: 'alerts' },
      },
    };
    renderInterop(buildLegacyUrl(legacyState));

    await act(async () => {
      jest.runAllTimers();
      await Promise.resolve();
    });

    expect(mockFlyoutApi.openHostFlyout).toHaveBeenCalledWith(
      expect.objectContaining({ hostName: 'my-host' })
    );
  });

  it('opens a rule flyout for rule right-only legacy URL', async () => {
    const legacyState = {
      right: { id: 'rule-panel', params: { ruleId: 'rule-42' } },
    };
    renderInterop(buildLegacyUrl(legacyState));

    await act(async () => {
      jest.runAllTimers();
      await Promise.resolve();
    });

    expect(mockFlyoutApi.openRuleFlyout).toHaveBeenCalledWith({ ruleId: 'rule-42' });
  });

  it('resolves the attack hit against the PageScope.attacks data view, not PageScope.default', async () => {
    // The attack discovery alerts backing index is not part of the default page-scope data
    // view's index pattern — using it there silently finds no hit and wrongly falls back to
    // the attack main flyout. Give each scope a distinct data view instance so we can assert
    // the attack fetch used the attacks-scoped one.
    const mockAttacksDataView = { getRuntimeMappings: jest.fn(() => ({})) };
    (useDataView as jest.Mock).mockImplementation((scope: PageScope) =>
      scope === PageScope.attacks
        ? { dataView: mockAttacksDataView, status: 'ready' }
        : { dataView: mockDataView, status: 'ready' }
    );
    withHit({ id: 'atk-3', raw: { _id: 'atk-3', _index: 'idx', fields: {} }, flattened: {} });

    const legacyState = {
      right: { id: 'attack-details-right', params: { attackId: 'atk-3', indexName: 'idx' } },
      left: { id: 'attack-details-left', path: { tab: 'insights', subTab: 'correlation' } },
    };
    renderInterop(buildLegacyUrl(legacyState));

    await act(async () => {
      jest.runAllTimers();
      await Promise.resolve();
    });

    const attackFetchCall = (useEsDocSearch as jest.Mock).mock.calls.find(
      ([params]) => params.id === 'atk-3'
    );
    expect(attackFetchCall?.[0].dataView).toBe(mockAttacksDataView);
    expect(mockFlyoutApi.openAttackCorrelations).toHaveBeenCalledWith(
      expect.objectContaining({ hit: expect.objectContaining({ id: 'atk-3' }) })
    );
  });

  it('opens nothing for IOC legacy URL (missing indicatorIndex)', async () => {
    const legacyState = {
      right: { id: 'ioc-details-right', params: { id: 'ioc-1' } },
    };
    renderInterop(buildLegacyUrl(legacyState));

    await act(async () => {
      jest.runAllTimers();
      await Promise.resolve();
    });

    // IOC descriptor is null → nothing opens
    expect(mockFlyoutApi.openIocFlyout).not.toHaveBeenCalled();
  });

  it('ignores eventFlyout param (different param key)', async () => {
    // eventFlyout is never passed as legacyParamKey — the hook is not mounted for it
    const eventFlyoutUrl = `/?eventFlyout=${encode({
      right: { id: 'document-details-right', params: { id: 'd', indexName: 'i', scopeId: 's' } },
    })}`;
    const history = createMemoryHistory({ initialEntries: [eventFlyoutUrl] });
    const wrapper: React.FC<{ children?: React.ReactNode }> = ({ children }) =>
      React.createElement(Router, { history }, children as React.ReactElement);
    renderHook(() => useLegacyFlyoutUrlInterop(LEGACY_PARAM, V2_PARAM), { wrapper });

    await act(async () => {
      jest.runAllTimers();
      await Promise.resolve();
    });

    // Nothing opened — flyout param not present for the LEGACY_PARAM key
    expect(mockFlyoutApi.openDocumentFlyoutFromIndex).not.toHaveBeenCalled();
  });

  it('opens nothing when legacy param is absent', async () => {
    renderInterop('/?some=other-param');

    await act(async () => {
      jest.runAllTimers();
      await Promise.resolve();
    });

    expect(mockFlyoutApi.openDocumentFlyoutFromIndex).not.toHaveBeenCalled();
  });
});
