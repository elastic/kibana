/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiCallOut } from '@elastic/eui';
import { getFieldValue } from '@kbn/discover-utils';
import type { DataTableRecord } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import { ElasticRequestState } from '@kbn/unified-doc-viewer';
import { useEsDocSearch } from '@kbn/unified-doc-viewer-plugin/public';
import { useStore } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { FlowTargetSourceDest } from '../../../common/search_strategy/security_solution/network';
import { useIsInSecurityApp } from '../../common/hooks/is_in_security_app';
import { useKibana } from '../../common/lib/kibana';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';
import { PageScope } from '../../data_view_manager/constants';
import { useRuleWithFallback } from '../../detection_engine/rule_management/logic/use_rule_with_fallback';
import { FlyoutLoading } from '../../flyout/shared/components/flyout_loading';
import { AnalyzerGraph } from '../analyzer';
import { CorrelationsDetails } from '../correlations';
import { alertFlyoutHistoryKey } from '../document/constants/flyout_history';
import { EventKind } from '../document/constants/event_kinds';
import { openDocumentFlyout } from '../document/open_document_flyout';
import { InvestigationGuide } from '../investigation_guide';
import { Network } from '../network_details';
import { NotesDetails } from '../notes';
import { PrevalenceDetails } from '../prevalence';
import { getColumns } from '../prevalence/utils/get_columns';
import { SessionView } from '../session_view';
import { cellActionRenderer } from '../shared/components/cell_actions';
import { ChildLink } from '../shared/components/child_link';
import { useDefaultDocumentFlyoutProperties } from '../shared/hooks/use_default_flyout_properties';
import { ThreatIntelligenceDetails } from '../threat_intelligence';
import type { ToolFlyoutPersistedState } from './url_state';

const TOOL_FLYOUT_UNAVAILABLE = i18n.translate('xpack.securitySolution.flyout.tools.unavailable', {
  defaultMessage: 'Unable to restore tool flyout.',
});

const TOOL_FLYOUT_FETCH_ERROR = i18n.translate('xpack.securitySolution.flyout.tools.fetchError', {
  defaultMessage: 'Unable to fetch the document needed to restore this tool flyout.',
});

const ToolFlyoutFromHit = memo(
  ({ state, hit }: { state: ToolFlyoutPersistedState; hit: DataTableRecord }) => {
    const { services } = useKibana();
    const { overlays } = services;
    const store = useStore();
    const history = useHistory();
    const defaultDocumentFlyoutProperties = useDefaultDocumentFlyoutProperties();
    const isInSecurityApp = useIsInSecurityApp();

    const onShowAlert = useCallback(
      (id: string, indexName: string) => {
        openDocumentFlyout({
          overlays,
          services,
          store,
          history,
          documentId: id,
          indexName,
          renderCellActions: cellActionRenderer,
          onAlertUpdated: () => {},
          defaultFlyoutProperties: defaultDocumentFlyoutProperties,
          historyKey: alertFlyoutHistoryKey,
          session: 'inherit',
        });
      },
      [defaultDocumentFlyoutProperties, history, overlays, services, store]
    );

    const ruleId = useMemo(
      () =>
        (getFieldValue(hit, EVENT_KIND) as string) === EventKind.signal
          ? (getFieldValue(hit, 'kibana.alert.rule.uuid') as string)
          : (getFieldValue(hit, 'signal.rule.id') as string),
      [hit]
    );
    const { rule } = useRuleWithFallback(ruleId);
    const investigationFields = useMemo(
      () => rule?.investigation_fields?.field_names ?? [],
      [rule?.investigation_fields?.field_names]
    );

    if (state.toolType === 'notes') {
      return <NotesDetails hit={hit} />;
    }

    if (state.toolType === 'correlations') {
      return (
        <CorrelationsDetails hit={hit} scopeId="" isRulePreview={false} onShowAlert={onShowAlert} />
      );
    }

    if (state.toolType === 'prevalence') {
      return (
        <PrevalenceDetails
          hit={hit}
          investigationFields={investigationFields}
          scopeId=""
          columns={getColumns(cellActionRenderer, isInSecurityApp, '', ChildLink)}
        />
      );
    }

    if (state.toolType === 'threat_intelligence') {
      return <ThreatIntelligenceDetails hit={hit} />;
    }

    if (state.toolType === 'investigation_guide') {
      return <InvestigationGuide hit={hit} />;
    }

    if (state.toolType === 'analyzer') {
      return (
        <AnalyzerGraph hit={hit} renderCellActions={cellActionRenderer} onAlertUpdated={() => {}} />
      );
    }

    if (state.toolType === 'session_view') {
      return (
        <SessionView hit={hit} renderCellActions={cellActionRenderer} onAlertUpdated={() => {}} />
      );
    }

    return (
      <EuiCallOut
        announceOnMount
        iconType="warning"
        color="danger"
        title={TOOL_FLYOUT_UNAVAILABLE}
        size="s"
      />
    );
  }
);

ToolFlyoutFromHit.displayName = 'ToolFlyoutFromHit';

const RestoredDocBasedToolFlyout = memo(({ state }: { state: ToolFlyoutPersistedState }) => {
  const { dataView, status } = useDataView(PageScope.default);
  const docRef = state.docRef;

  const isDataViewLoading = status === 'loading' || status === 'pristine';
  const isDataViewInvalid =
    status === 'error' || (status === 'ready' && !dataView.hasMatchedIndices());
  const shouldSkipSearch = isDataViewLoading || isDataViewInvalid || !dataView || !docRef;

  const [requestState, hit] = useEsDocSearch({
    id: docRef?.documentId ?? '',
    index: docRef?.indexName,
    dataView,
    skip: shouldSkipSearch,
  });

  if (!docRef) {
    return (
      <EuiCallOut
        announceOnMount
        iconType="warning"
        color="danger"
        title={TOOL_FLYOUT_UNAVAILABLE}
        size="s"
      />
    );
  }

  if (isDataViewLoading || requestState === ElasticRequestState.Loading) {
    return <FlyoutLoading data-test-subj="restored-tool-flyout-loading" />;
  }

  if (isDataViewInvalid || requestState === ElasticRequestState.Error) {
    return (
      <EuiCallOut
        announceOnMount
        iconType="warning"
        color="danger"
        title={TOOL_FLYOUT_FETCH_ERROR}
        size="s"
      />
    );
  }

  if (requestState !== ElasticRequestState.Found || !hit) {
    return (
      <EuiCallOut
        announceOnMount
        iconType="warning"
        color="danger"
        title={TOOL_FLYOUT_UNAVAILABLE}
        size="s"
      />
    );
  }

  return <ToolFlyoutFromHit state={state} hit={hit} />;
});

RestoredDocBasedToolFlyout.displayName = 'RestoredDocBasedToolFlyout';

export const RestoredToolFlyoutContent = memo(({ state }: { state: ToolFlyoutPersistedState }) => {
  if (state.toolType === 'network_details' && state.networkDetails) {
    const { ip, flowTarget } = state.networkDetails;
    const safeFlowTarget =
      flowTarget === FlowTargetSourceDest.destination
        ? FlowTargetSourceDest.destination
        : FlowTargetSourceDest.source;

    return <Network ip={ip} flowTarget={safeFlowTarget} />;
  }

  return <RestoredDocBasedToolFlyout state={state} />;
});

RestoredToolFlyoutContent.displayName = 'RestoredToolFlyoutContent';
