/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { encode } from '@kbn/rison';
import { useFlyoutV2RestoreFromUrl } from './use_flyout_v2_restore';
import { FLYOUT_V2_URL_PARAM, FLYOUT_V2_TIMELINE_URL_PARAM } from './flyout_v2_url_param';
import type { FlyoutV2UrlParamValue } from './flyout_v2_url_param';
import { useFlyoutApi } from '../../use_flyout_api';
import { createFlyoutApiMock } from '../../use_flyout_api.mock';
import { ElasticRequestState } from '@kbn/unified-doc-viewer';
import { useEsDocSearch } from '@kbn/unified-doc-viewer-plugin/public';
import { useIsNewFlyoutEnabled } from '../../../common/hooks/use_is_new_flyout_enabled';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { PageScope } from '../../../data_view_manager/constants';

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

const mockDataView = {
  getRuntimeMappings: jest.fn(() => ({})),
  hasMatchedIndices: jest.fn(() => true),
};
(useDataView as jest.Mock).mockReturnValue({ dataView: mockDataView, status: 'ready' });

// useEsDocSearch returns [ElasticRequestState, DataTableRecord | null, refetch].
// Settled with no hit → terminal NotFound; resolved → Found + record; in-flight → Loading.
const noHit = () =>
  (useEsDocSearch as jest.Mock).mockReturnValue([ElasticRequestState.NotFound, null, jest.fn()]);

const withHit = (record: Record<string, unknown>) =>
  (useEsDocSearch as jest.Mock).mockReturnValue([ElasticRequestState.Found, record, jest.fn()]);

const loadingHit = () =>
  (useEsDocSearch as jest.Mock).mockReturnValue([ElasticRequestState.Loading, null, jest.fn()]);

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const buildUrl = (
  descriptors: FlyoutV2UrlParamValue,
  paramKey: typeof FLYOUT_V2_URL_PARAM | typeof FLYOUT_V2_TIMELINE_URL_PARAM = FLYOUT_V2_URL_PARAM
) => `/?${paramKey}=${encode(descriptors)}`;

const renderRestore = (url: string) => {
  const history = createMemoryHistory({ initialEntries: [url] });
  const wrapper: React.FC<{ children?: React.ReactNode }> = ({ children }) =>
    React.createElement(Router, { history }, children as React.ReactElement);
  const { result, rerender } = renderHook(() => useFlyoutV2RestoreFromUrl(FLYOUT_V2_URL_PARAM), {
    wrapper,
  });
  return { result, history, rerender };
};

// DataTableRecord-shaped (useEsDocSearch already returns records, not raw hits).
const docSearchHit = {
  id: 'doc-1',
  raw: { _id: 'doc-1', _index: 'logs-*', fields: {} },
  flattened: {},
};
const attackSearchHit = {
  id: 'attack-1',
  raw: { _id: 'attack-1', _index: '.alerts-*', fields: {} },
  flattened: {},
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useFlyoutV2RestoreFromUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (useFlyoutApi as jest.Mock).mockReturnValue(mockFlyoutApi);
    (useIsNewFlyoutEnabled as jest.Mock).mockReturnValue(true);
    (useDataView as jest.Mock).mockReturnValue({ dataView: mockDataView, status: 'ready' });
    noHit();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // -----------------------------------------------------------------------
  // Gate: new flyout disabled
  // -----------------------------------------------------------------------

  it('does not open anything when the new flyout is disabled', () => {
    (useIsNewFlyoutEnabled as jest.Mock).mockReturnValue(false);
    renderRestore(buildUrl([{ kind: 'document', documentId: 'doc-1', indexName: 'x' }]));
    act(() => {
      jest.runAllTimers();
    });
    expect(mockFlyoutApi.openDocumentFlyoutFromIndex).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Malformed / absent param
  // -----------------------------------------------------------------------

  it('strips a malformed param and opens nothing', () => {
    const history = createMemoryHistory({
      initialEntries: [`/?${FLYOUT_V2_URL_PARAM}=!!!invalid`],
    });
    const wrapper: React.FC<{ children?: React.ReactNode }> = ({ children }) =>
      React.createElement(Router, { history }, children as React.ReactElement);
    renderHook(() => useFlyoutV2RestoreFromUrl(FLYOUT_V2_URL_PARAM), { wrapper });

    act(() => {
      jest.runAllTimers();
    });

    expect(new URLSearchParams(history.location.search).get(FLYOUT_V2_URL_PARAM)).toBeNull();
    expect(mockFlyoutApi.openDocumentFlyoutFromIndex).not.toHaveBeenCalled();
  });

  it('does nothing when the param is absent', () => {
    renderRestore('/');
    act(() => {
      jest.runAllTimers();
    });
    expect(mockFlyoutApi.openDocumentFlyoutFromIndex).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Single-main descriptors (no fetch required)
  // -----------------------------------------------------------------------

  it('opens a document flyout from a single document descriptor', () => {
    const url = buildUrl([{ kind: 'document', documentId: 'doc-1', indexName: 'logs-*' }]);
    renderRestore(url);
    act(() => {
      jest.runAllTimers();
    });
    expect(mockFlyoutApi.openDocumentFlyoutFromIndex).toHaveBeenCalledWith({
      documentId: 'doc-1',
      indexName: 'logs-*',
    });
  });

  it('opens a documentFromPattern flyout', () => {
    renderRestore(
      buildUrl([{ kind: 'documentFromPattern', documentId: 'doc-1', indexName: '.siem-signals-*' }])
    );
    act(() => {
      jest.runAllTimers();
    });
    expect(mockFlyoutApi.openDocumentFlyoutFromPattern).toHaveBeenCalledWith({
      documentId: 'doc-1',
      indexName: '.siem-signals-*',
    });
  });

  it('opens an attack flyout', () => {
    renderRestore(buildUrl([{ kind: 'attack', attackId: 'atk-1', indexName: '.alerts-*' }]));
    act(() => {
      jest.runAllTimers();
    });
    expect(mockFlyoutApi.openAttackFlyout).toHaveBeenCalledWith({
      attackId: 'atk-1',
      indexName: '.alerts-*',
    });
  });

  it('opens a host flyout', () => {
    renderRestore(buildUrl([{ kind: 'host', hostName: 'my-host', entityId: 'eid' }]));
    act(() => {
      jest.runAllTimers();
    });
    expect(mockFlyoutApi.openHostFlyout).toHaveBeenCalledWith(
      expect.objectContaining({ hostName: 'my-host', entityId: 'eid' })
    );
  });

  it('opens a user flyout', () => {
    renderRestore(buildUrl([{ kind: 'user', userName: 'alice' }]));
    act(() => {
      jest.runAllTimers();
    });
    expect(mockFlyoutApi.openUserFlyout).toHaveBeenCalledWith(
      expect.objectContaining({ userName: 'alice' })
    );
  });

  it('opens a rule flyout', () => {
    renderRestore(buildUrl([{ kind: 'rule', ruleId: 'rule-1' }]));
    act(() => {
      jest.runAllTimers();
    });
    expect(mockFlyoutApi.openRuleFlyout).toHaveBeenCalledWith({ ruleId: 'rule-1' });
  });

  it('opens a network flyout', () => {
    renderRestore(buildUrl([{ kind: 'network', ip: '1.2.3.4', flowTarget: 'source' }]));
    act(() => {
      jest.runAllTimers();
    });
    expect(mockFlyoutApi.openNetworkFlyout).toHaveBeenCalledWith({
      ip: '1.2.3.4',
      flowTarget: 'source',
    });
  });

  it('opens a CSP misconfiguration flyout', () => {
    renderRestore(
      buildUrl([{ kind: 'cspMisconfiguration', resourceId: 'res-1', ruleId: 'csp-1' }])
    );
    act(() => {
      jest.runAllTimers();
    });
    expect(mockFlyoutApi.openMisconfigurationFinding).toHaveBeenCalledWith({
      resourceId: 'res-1',
      ruleId: 'csp-1',
    });
  });

  it('opens a CSP vulnerability flyout', () => {
    renderRestore(
      buildUrl([{ kind: 'cspVulnerability', vulnerabilityId: 'CVE-1', resourceId: 'r1' }])
    );
    act(() => {
      jest.runAllTimers();
    });
    expect(mockFlyoutApi.openVulnerabilityFinding).toHaveBeenCalledWith(
      expect.objectContaining({ vulnerabilityId: 'CVE-1' })
    );
  });

  // -----------------------------------------------------------------------
  // Entity tools (no fetch required)
  // -----------------------------------------------------------------------

  it('opens entityRiskInputs with entityType cast', () => {
    renderRestore(
      buildUrl([{ kind: 'entityRiskInputs', entityType: 'host', entityName: 'h', entityId: 'eid' }])
    );
    act(() => {
      jest.runAllTimers();
    });
    expect(mockFlyoutApi.openEntityRiskInputs).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'host', entityName: 'h' })
    );
  });

  it('restores the tool header source context by passing an onShowEntity that reopens the host', () => {
    renderRestore(
      buildUrl([{ kind: 'entityRiskInputs', entityType: 'host', entityName: 'h', entityId: 'eid' }])
    );
    act(() => {
      jest.runAllTimers();
    });
    const { onShowEntity } = mockFlyoutApi.openEntityRiskInputs.mock.calls[0][0];
    expect(typeof onShowEntity).toBe('function');

    // Invoking the header callback reopens the originating entity flyout as a child.
    act(() => {
      onShowEntity?.();
    });
    expect(mockFlyoutApi.openHostFlyoutAsChild).toHaveBeenCalledWith(
      expect.objectContaining({ hostName: 'h', entityId: 'eid', title: 'h' })
    );
  });

  it('reopens the originating user for a user-scoped tool header callback', () => {
    renderRestore(
      buildUrl([
        { kind: 'entityAnomalyInsights', entityType: 'user', value: 'alice', entityId: 'uid' },
      ])
    );
    act(() => {
      jest.runAllTimers();
    });
    const { onOpenEntity } = mockFlyoutApi.openEntityAnomalyInsights.mock.calls[0][0];
    expect(typeof onOpenEntity).toBe('function');
    act(() => {
      onOpenEntity?.();
    });
    expect(mockFlyoutApi.openUserFlyoutAsChild).toHaveBeenCalledWith(
      expect.objectContaining({ userName: 'alice', entityId: 'uid', title: 'alice' })
    );
  });

  it('opens entityEntraInsights by constructing ManagedUserHit from stored id/index', () => {
    renderRestore(
      buildUrl([
        {
          kind: 'entityEntraInsights',
          managedUserId: 'mid',
          managedUserIndex: 'idx',
          value: 'alice',
        },
      ])
    );
    act(() => {
      jest.runAllTimers();
    });
    expect(mockFlyoutApi.openEntityEntraInsights).toHaveBeenCalledWith(
      expect.objectContaining({
        managedUser: { _id: 'mid', _index: 'idx' },
        value: 'alice',
      })
    );
  });

  it('opens entityOktaInsights by constructing ManagedUserHit from stored id/index', () => {
    renderRestore(
      buildUrl([
        {
          kind: 'entityOktaInsights',
          managedUserId: 'oid',
          managedUserIndex: 'okta-idx',
          value: 'bob',
        },
      ])
    );
    act(() => {
      jest.runAllTimers();
    });
    expect(mockFlyoutApi.openEntityOktaInsights).toHaveBeenCalledWith(
      expect.objectContaining({
        managedUser: { _id: 'oid', _index: 'okta-idx' },
        value: 'bob',
      })
    );
  });

  // -----------------------------------------------------------------------
  // Document tools (need document hit fetch)
  // -----------------------------------------------------------------------

  it('waits for loading before opening a document tool', () => {
    loadingHit();
    renderRestore(buildUrl([{ kind: 'analyzer', documentId: 'doc-1', indexName: 'logs-*' }]));
    act(() => {
      jest.runAllTimers();
    });
    expect(mockFlyoutApi.openAnalyzer).not.toHaveBeenCalled();
  });

  it('opens the analyzer once the document hit is resolved', () => {
    withHit(docSearchHit);
    renderRestore(buildUrl([{ kind: 'analyzer', documentId: 'doc-1', indexName: 'logs-*' }]));
    act(() => {
      jest.runAllTimers();
    });
    expect(mockFlyoutApi.openAnalyzer).toHaveBeenCalledWith(
      expect.objectContaining({ hit: expect.objectContaining({ id: 'doc-1' }) })
    );
  });

  it('falls back to the document flyout after the fetch settles with no hit', () => {
    // The fetch runs (loading) and then settles empty — only then is the document fallback correct.
    loadingHit();
    const { rerender } = renderRestore(
      buildUrl([{ kind: 'analyzer', documentId: 'doc-1', indexName: 'logs-*' }])
    );
    act(() => {
      jest.runAllTimers();
    });
    // Still loading — must not fall back yet.
    expect(mockFlyoutApi.openDocumentFlyoutFromIndex).not.toHaveBeenCalled();

    // Fetch settles with no hit → now the document fallback is expected.
    noHit();
    rerender();
    act(() => {
      jest.runAllTimers();
    });
    expect(mockFlyoutApi.openAnalyzer).not.toHaveBeenCalled();
    expect(mockFlyoutApi.openDocumentFlyoutFromIndex).toHaveBeenCalledWith({
      documentId: 'doc-1',
      indexName: 'logs-*',
    });
  });

  it('does NOT fall back to the document flyout during the data-view-ready race (regression)', () => {
    // Repro for the bug where refreshing on an open tools flyout reopened the document flyout.
    // While the data view is not ready the fetch is skipped, so useTimelineEventsDetails reports
    // loading=false with no hit — which previously looked (wrongly) like "fetch finished, no hit".
    (useDataView as jest.Mock).mockReturnValue({ dataView: null, status: 'loading' });
    noHit();
    const { rerender } = renderRestore(
      buildUrl([{ kind: 'analyzer', documentId: 'doc-1', indexName: 'logs-*' }])
    );
    act(() => {
      jest.runAllTimers();
    });
    // The fetch has not started — must NOT prematurely open the document main flyout.
    expect(mockFlyoutApi.openDocumentFlyoutFromIndex).not.toHaveBeenCalled();

    // Data view becomes ready and the fetch starts (loading, still no hit).
    (useDataView as jest.Mock).mockReturnValue({ dataView: mockDataView, status: 'ready' });
    loadingHit();
    rerender();
    act(() => {
      jest.runAllTimers();
    });
    expect(mockFlyoutApi.openDocumentFlyoutFromIndex).not.toHaveBeenCalled();

    // Fetch resolves with the hit → the analyzer tool opens, never the document fallback.
    withHit(docSearchHit);
    rerender();
    act(() => {
      jest.runAllTimers();
    });
    expect(mockFlyoutApi.openAnalyzer).toHaveBeenCalledWith(
      expect.objectContaining({ hit: expect.objectContaining({ id: 'doc-1' }) })
    );
    expect(mockFlyoutApi.openDocumentFlyoutFromIndex).not.toHaveBeenCalled();
  });

  it('opens the session view tool with the resolved hit', () => {
    withHit(docSearchHit);
    renderRestore(
      buildUrl([
        { kind: 'sessionView', documentId: 'doc-1', indexName: 'logs-*', jumpToCursor: 'cur' },
      ])
    );
    act(() => {
      jest.runAllTimers();
    });
    expect(mockFlyoutApi.openSessionView).toHaveBeenCalledWith(
      expect.objectContaining({
        hit: expect.objectContaining({ id: 'doc-1' }),
        jumpToCursor: 'cur',
      })
    );
  });

  it('opens documentEntities with the resolved hit', () => {
    withHit(docSearchHit);
    renderRestore(
      buildUrl([{ kind: 'documentEntities', documentId: 'doc-1', indexName: 'i', scopeId: 's' }])
    );
    act(() => {
      jest.runAllTimers();
    });
    expect(mockFlyoutApi.openDocumentEntities).toHaveBeenCalledWith(
      expect.objectContaining({ hit: expect.objectContaining({ id: 'doc-1' }), scopeId: 's' })
    );
  });

  it('opens documentCorrelations with the resolved hit and a default onShowAlert callback', () => {
    withHit(docSearchHit);
    renderRestore(
      buildUrl([
        {
          kind: 'documentCorrelations',
          documentId: 'doc-1',
          indexName: 'i',
          scopeId: 's',
          isRulePreview: false,
        },
      ])
    );
    act(() => {
      jest.runAllTimers();
    });
    expect(mockFlyoutApi.openDocumentCorrelations).toHaveBeenCalledWith(
      expect.objectContaining({
        hit: expect.objectContaining({ id: 'doc-1' }),
        scopeId: 's',
        isRulePreview: false,
        onShowAlert: expect.any(Function),
      })
    );
  });

  it('opens documentPrevalence with the resolved hit (columns are built internally, not restored)', () => {
    withHit(docSearchHit);
    renderRestore(
      buildUrl([
        {
          kind: 'documentPrevalence',
          documentId: 'doc-1',
          indexName: 'i',
          scopeId: 's',
          investigationFields: ['host.name'],
        },
      ])
    );
    act(() => {
      jest.runAllTimers();
    });
    expect(mockFlyoutApi.openDocumentPrevalence).toHaveBeenCalledWith(
      expect.objectContaining({
        hit: expect.objectContaining({ id: 'doc-1' }),
        scopeId: 's',
        investigationFields: ['host.name'],
      })
    );
    expect(mockFlyoutApi.openDocumentFlyoutFromIndex).not.toHaveBeenCalled();
  });

  it('falls back to document flyout for documentPrevalence when the hit cannot be resolved', () => {
    noHit();
    renderRestore(
      buildUrl([
        {
          kind: 'documentPrevalence',
          documentId: 'doc-1',
          indexName: 'i',
          scopeId: 's',
          investigationFields: ['host.name'],
        },
      ])
    );
    act(() => {
      jest.runAllTimers();
    });
    expect(mockFlyoutApi.openDocumentPrevalence).not.toHaveBeenCalled();
    expect(mockFlyoutApi.openDocumentFlyoutFromIndex).toHaveBeenCalledWith({
      documentId: 'doc-1',
      indexName: 'i',
    });
  });

  it('opens notes with the resolved hit', () => {
    withHit(docSearchHit);
    renderRestore(buildUrl([{ kind: 'notes', documentId: 'doc-1', indexName: 'i' }]));
    act(() => {
      jest.runAllTimers();
    });
    expect(mockFlyoutApi.openNotes).toHaveBeenCalledWith(
      expect.objectContaining({ hit: expect.objectContaining({ id: 'doc-1' }) })
    );
  });

  // -----------------------------------------------------------------------
  // Attack tools (need attack hit fetch)
  // -----------------------------------------------------------------------

  it('opens attackCorrelations with the resolved attack hit', () => {
    withHit(attackSearchHit);
    renderRestore(
      buildUrl([
        { kind: 'attackCorrelations', attackId: 'atk-1', indexName: '.alerts-*', alertIds: ['a1'] },
      ])
    );
    act(() => {
      jest.runAllTimers();
    });
    expect(mockFlyoutApi.openAttackCorrelations).toHaveBeenCalledWith(
      expect.objectContaining({
        hit: expect.objectContaining({ id: 'attack-1' }),
        alertIds: ['a1'],
      })
    );
  });

  it('falls back to attack flyout after the fetch settles with no hit', () => {
    loadingHit();
    const { rerender } = renderRestore(
      buildUrl([
        { kind: 'attackCorrelations', attackId: 'atk-1', indexName: '.alerts-*', alertIds: [] },
      ])
    );
    act(() => {
      jest.runAllTimers();
    });
    expect(mockFlyoutApi.openAttackFlyout).not.toHaveBeenCalled();

    noHit();
    rerender();
    act(() => {
      jest.runAllTimers();
    });
    expect(mockFlyoutApi.openAttackCorrelations).not.toHaveBeenCalled();
    expect(mockFlyoutApi.openAttackFlyout).toHaveBeenCalledWith({
      attackId: 'atk-1',
      indexName: '.alerts-*',
    });
  });

  it('resolves the attack hit against the PageScope.attacks data view, not PageScope.default', () => {
    // The attack discovery alerts backing index is not part of the default page-scope data
    // view's index pattern — using it there silently finds no hit and wrongly falls back to
    // the attack main flyout on restore. Give each scope a distinct data view instance so we
    // can assert the attack fetch used the attacks-scoped one.
    const mockAttacksDataView = {
      getRuntimeMappings: jest.fn(() => ({})),
      hasMatchedIndices: jest.fn(() => true),
    };
    (useDataView as jest.Mock).mockImplementation((scope: PageScope) =>
      scope === PageScope.attacks
        ? { dataView: mockAttacksDataView, status: 'ready' }
        : { dataView: mockDataView, status: 'ready' }
    );
    withHit(attackSearchHit);
    renderRestore(
      buildUrl([
        { kind: 'attackCorrelations', attackId: 'atk-1', indexName: '.alerts-*', alertIds: ['a1'] },
      ])
    );
    act(() => {
      jest.runAllTimers();
    });

    const attackFetchCall = (useEsDocSearch as jest.Mock).mock.calls.find(
      ([params]) => params.id === 'atk-1'
    );
    expect(attackFetchCall?.[0].dataView).toBe(mockAttacksDataView);
    expect(mockFlyoutApi.openAttackCorrelations).toHaveBeenCalledWith(
      expect.objectContaining({ hit: expect.objectContaining({ id: 'attack-1' }) })
    );
  });

  it('waits for the attacks data view specifically, independent of the default one', () => {
    // Only an attack descriptor is present (no doc/ioc), so restore should gate on
    // PageScope.attacks readiness and must not hang waiting on PageScope.default.
    (useDataView as jest.Mock).mockImplementation((scope: PageScope) =>
      scope === PageScope.attacks
        ? { dataView: null, status: 'loading' }
        : { dataView: mockDataView, status: 'ready' }
    );
    renderRestore(
      buildUrl([
        { kind: 'attackCorrelations', attackId: 'atk-1', indexName: '.alerts-*', alertIds: ['a1'] },
      ])
    );
    act(() => {
      jest.runAllTimers();
    });
    expect(mockFlyoutApi.openAttackCorrelations).not.toHaveBeenCalled();
    expect(mockFlyoutApi.openAttackFlyout).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // IOC (needs indicator fetch)
  // -----------------------------------------------------------------------

  it('opens the IOC flyout once the indicator document is fetched', () => {
    const iocHit = {
      id: 'ioc-1',
      raw: { _id: 'ioc-1', _index: 'ti-*', fields: { 'threat.indicator.type': ['domain'] } },
      flattened: {},
    };
    withHit(iocHit);
    renderRestore(buildUrl([{ kind: 'ioc', indicatorId: 'ioc-1', indicatorIndex: 'ti-*' }]));
    act(() => {
      jest.runAllTimers();
    });
    expect(mockFlyoutApi.openIocFlyout).toHaveBeenCalledWith(
      expect.objectContaining({
        indicator: expect.objectContaining({ _id: 'ioc-1', _index: 'ti-*' }),
      })
    );
  });

  it('does not open the IOC flyout when the indicator cannot be fetched', () => {
    noHit();
    renderRestore(buildUrl([{ kind: 'ioc', indicatorId: 'ioc-1', indicatorIndex: 'ti-*' }]));
    act(() => {
      jest.runAllTimers();
    });
    expect(mockFlyoutApi.openIocFlyout).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // [tool, child] two-entry chain
  // -----------------------------------------------------------------------

  it('opens [tool, child] — both entries with correct session variants', () => {
    withHit(docSearchHit);
    renderRestore(
      buildUrl([
        { kind: 'analyzer', documentId: 'doc-1', indexName: 'logs-*' },
        { kind: 'document', documentId: 'doc-1', indexName: 'logs-*' },
      ])
    );
    act(() => {
      jest.runAllTimers();
    });
    // tool (position 0): openAnalyzer with the resolved hit
    expect(mockFlyoutApi.openAnalyzer).toHaveBeenCalledWith(
      expect.objectContaining({ hit: expect.objectContaining({ id: 'doc-1' }) })
    );
    // child (position 1): openDocumentFlyoutFromIndexAsChild
    expect(mockFlyoutApi.openDocumentFlyoutFromIndexAsChild).toHaveBeenCalledWith(
      expect.objectContaining({ documentId: 'doc-1', indexName: 'logs-*' })
    );
  });

  it('opens [host, document] — host as start, document as AsChild', () => {
    renderRestore(
      buildUrl([
        { kind: 'host', hostName: 'my-host' },
        { kind: 'document', documentId: 'doc-1', indexName: 'i' },
      ])
    );
    act(() => {
      jest.runAllTimers();
    });
    expect(mockFlyoutApi.openHostFlyout).toHaveBeenCalledWith(
      expect.objectContaining({ hostName: 'my-host' })
    );
    expect(mockFlyoutApi.openDocumentFlyoutFromIndexAsChild).toHaveBeenCalledWith(
      expect.objectContaining({ documentId: 'doc-1' })
    );
  });

  it('opens [cspMisconfiguration, attack] — second entry via openAttackFlyoutAsChild', () => {
    renderRestore(
      buildUrl([
        { kind: 'cspMisconfiguration', resourceId: 'res-1', ruleId: 'csp-1' },
        { kind: 'attack', attackId: 'atk-1', indexName: '.alerts-*' },
      ])
    );
    act(() => {
      jest.runAllTimers();
    });
    expect(mockFlyoutApi.openMisconfigurationFinding).toHaveBeenCalled();
    expect(mockFlyoutApi.openAttackFlyoutAsChild).toHaveBeenCalledWith(
      expect.objectContaining({ attackId: 'atk-1' })
    );
  });

  it('opens [analyzer, host] — tool restores and the entity child restores via AsChild', () => {
    // Covers the tool -> document -> host navigation, which the writer persists as [analyzer, host]
    // (root tool + newest/deepest child). Both must reopen.
    withHit(docSearchHit);
    renderRestore(
      buildUrl([
        { kind: 'analyzer', documentId: 'doc-1', indexName: 'logs-*' },
        { kind: 'host', hostName: 'my-host', entityId: 'eid' },
      ])
    );
    act(() => {
      jest.runAllTimers();
    });
    expect(mockFlyoutApi.openAnalyzer).toHaveBeenCalledWith(
      expect.objectContaining({ hit: expect.objectContaining({ id: 'doc-1' }) })
    );
    expect(mockFlyoutApi.openHostFlyoutAsChild).toHaveBeenCalledWith(
      expect.objectContaining({ hostName: 'my-host' })
    );
  });

  // -----------------------------------------------------------------------
  // Restore at most once
  // -----------------------------------------------------------------------

  it('only restores once even if re-rendered multiple times', () => {
    const { rerender } = renderRestore(
      buildUrl([{ kind: 'document', documentId: 'doc-1', indexName: 'i' }])
    );
    act(() => {
      jest.runAllTimers();
    });

    rerender();
    act(() => {
      jest.runAllTimers();
    });

    expect(mockFlyoutApi.openDocumentFlyoutFromIndex).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------------
  // Wait for data view before fetching
  // -----------------------------------------------------------------------

  it('waits for the data view to be ready before opening a fetch-dependent flyout', () => {
    (useDataView as jest.Mock).mockReturnValue({ dataView: null, status: 'loading' });
    renderRestore(buildUrl([{ kind: 'analyzer', documentId: 'doc-1', indexName: 'i' }]));
    act(() => {
      jest.runAllTimers();
    });
    expect(mockFlyoutApi.openAnalyzer).not.toHaveBeenCalled();
    expect(mockFlyoutApi.openDocumentFlyoutFromIndex).not.toHaveBeenCalled();
  });

  it('opens immediately (no data view wait) when no fetch is required', () => {
    (useDataView as jest.Mock).mockReturnValue({ dataView: null, status: 'loading' });
    renderRestore(buildUrl([{ kind: 'document', documentId: 'doc-1', indexName: 'i' }]));
    act(() => {
      jest.runAllTimers();
    });
    // Non-fetch descriptor (document) opens immediately regardless of data view status
    expect(mockFlyoutApi.openDocumentFlyoutFromIndex).toHaveBeenCalledWith({
      documentId: 'doc-1',
      indexName: 'i',
    });
  });

  // -----------------------------------------------------------------------
  // T-012: Timeline flyout context (second URL param)
  // -----------------------------------------------------------------------

  describe('Timeline context — flyoutV2Timeline param', () => {
    const renderTimelineRestore = (url: string) => {
      const history = createMemoryHistory({ initialEntries: [url] });
      const wrapper: React.FC<{ children?: React.ReactNode }> = ({ children }) =>
        React.createElement(Router, { history }, children as React.ReactElement);
      const { result, rerender } = renderHook(
        () => useFlyoutV2RestoreFromUrl(FLYOUT_V2_TIMELINE_URL_PARAM),
        { wrapper }
      );
      return { result, history, rerender };
    };

    it('restores a single document flyout from the Timeline param', () => {
      renderTimelineRestore(
        buildUrl(
          [{ kind: 'document', documentId: 'tl-doc-1', indexName: 'i' }],
          FLYOUT_V2_TIMELINE_URL_PARAM
        )
      );
      act(() => {
        jest.runAllTimers();
      });
      expect(mockFlyoutApi.openDocumentFlyoutFromIndex).toHaveBeenCalledWith({
        documentId: 'tl-doc-1',
        indexName: 'i',
      });
    });

    it('does NOT restore from the page flyoutV2 param when keyed to the Timeline param', () => {
      renderTimelineRestore(
        buildUrl(
          [{ kind: 'document', documentId: 'page-doc', indexName: 'i' }],
          FLYOUT_V2_URL_PARAM
        )
      );
      act(() => {
        jest.runAllTimers();
      });
      expect(mockFlyoutApi.openDocumentFlyoutFromIndex).not.toHaveBeenCalled();
    });

    it('restores a [tool, child] chain from the Timeline param', () => {
      withHit(docSearchHit);
      renderTimelineRestore(
        buildUrl(
          [
            { kind: 'analyzer', documentId: 'doc-1', indexName: 'logs-*' },
            { kind: 'document', documentId: 'doc-1', indexName: 'logs-*' },
          ],
          FLYOUT_V2_TIMELINE_URL_PARAM
        )
      );
      act(() => {
        jest.runAllTimers();
      });
      expect(mockFlyoutApi.openAnalyzer).toHaveBeenCalledWith(
        expect.objectContaining({ hit: expect.objectContaining({ id: 'doc-1' }) })
      );
      expect(mockFlyoutApi.openDocumentFlyoutFromIndexAsChild).toHaveBeenCalledWith(
        expect.objectContaining({ documentId: 'doc-1' })
      );
    });
  });

  describe('two-contexts-at-once', () => {
    it('page and Timeline restore hooks can both be mounted and restore independently', () => {
      const url = `/?${FLYOUT_V2_URL_PARAM}=${encode([
        { kind: 'host', hostName: 'page-host' },
      ])}&${FLYOUT_V2_TIMELINE_URL_PARAM}=${encode([
        { kind: 'user', userName: 'timeline-alice' },
      ])}`;
      const history = createMemoryHistory({ initialEntries: [url] });
      const wrapper: React.FC<{ children?: React.ReactNode }> = ({ children }) =>
        React.createElement(Router, { history }, children as React.ReactElement);

      renderHook(
        () => {
          useFlyoutV2RestoreFromUrl(FLYOUT_V2_URL_PARAM);
          useFlyoutV2RestoreFromUrl(FLYOUT_V2_TIMELINE_URL_PARAM);
        },
        { wrapper }
      );
      act(() => {
        jest.runAllTimers();
      });

      expect(mockFlyoutApi.openHostFlyout).toHaveBeenCalledWith(
        expect.objectContaining({ hostName: 'page-host' })
      );
      expect(mockFlyoutApi.openUserFlyout).toHaveBeenCalledWith(
        expect.objectContaining({ userName: 'timeline-alice' })
      );
    });

    it('a page flyout does not interfere with the Timeline restore', () => {
      // Only the Timeline param is present; page restore should not fire anything.
      const url = `/?${FLYOUT_V2_TIMELINE_URL_PARAM}=${encode([{ kind: 'rule', ruleId: 'r-tl' }])}`;
      const history = createMemoryHistory({ initialEntries: [url] });
      const wrapper: React.FC<{ children?: React.ReactNode }> = ({ children }) =>
        React.createElement(Router, { history }, children as React.ReactElement);

      renderHook(
        () => {
          useFlyoutV2RestoreFromUrl(FLYOUT_V2_URL_PARAM);
          useFlyoutV2RestoreFromUrl(FLYOUT_V2_TIMELINE_URL_PARAM);
        },
        { wrapper }
      );
      act(() => {
        jest.runAllTimers();
      });

      // Only the Timeline flyout (rule) should have been opened.
      expect(mockFlyoutApi.openRuleFlyout).toHaveBeenCalledWith({ ruleId: 'r-tl' });
      // openHostFlyout and other page-context openers should not have been called.
      expect(mockFlyoutApi.openHostFlyout).not.toHaveBeenCalled();
    });
  });
});
