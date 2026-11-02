/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EntityType as EntityStoreEntityType } from '@kbn/entity-store/public';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import type { CloudPostureEntityIdentifier } from '../../../cloud_security_posture/components/entity_insight';
import type { FieldsTableProps } from '../../../flyout/entity_details/generic_right/components/fields_table';
import { FieldsTableTab } from '../../../cloud_security_posture/components/csp_details/fields_table_tab';
import type { EntityType } from '../../../../common/search_strategy';
import {
  EntityDetailsLeftPanelTab,
  RiskScoreLeftPanelSubTab,
} from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { useStableExpandableFlyoutState } from '../../../flyout/shared/hooks/use_stable_expandable_flyout_state';
import { PREFIX } from '../../../flyout/shared/test_ids';
import { ALERT_PREVIEW_BANNER } from '../../../flyout/document_details/preview/constants';
import { DocumentDetailsPreviewPanelKey } from '../../../flyout/document_details/shared/constants/panel_keys';
import { RiskInputsTab } from './tabs/risk_inputs/risk_inputs_tab';
import { InsightsTabCsp } from '../../../cloud_security_posture/components/csp_details/insights_tab_csp';
import { ResolutionGroupTab } from '../entity_resolution/resolution_group_tab';
import { RESOLUTION_GROUP_TAB_TEST_ID } from '../entity_resolution/test_ids';
import { AnomaliesTab } from '../anomalies/anomalies_tab';

export const RISK_INPUTS_TAB_TEST_ID = `${PREFIX}RiskInputsTab` as const;
export const INSIGHTS_TAB_TEST_ID = `${PREFIX}InsightInputsTab` as const;
export const FIELDS_TABLE_TAB_TEST_ID = `${PREFIX}FieldsTableTab` as const;
export const ANOMALIES_TAB_TEST_ID = `${PREFIX}AnomaliesTab` as const;

interface RiskInputsTabWithAlertPreviewProps {
  entityType: EntityType;
  entityName: string;
  entityId?: string;
  scopeId: string;
}

interface RiskScorePanelProps extends FlyoutPanelProps {
  params: {
    path: {
      tab: EntityDetailsLeftPanelTab.RISK_INPUTS;
      subTab?: RiskScoreLeftPanelSubTab;
    };
  };
}

function isRiskScoreFlyoutPanelProps(
  panelLeft: FlyoutPanelProps | undefined
): panelLeft is RiskScorePanelProps {
  const params = panelLeft?.params;
  if (!params || typeof params !== 'object' || !('path' in params)) {
    return false;
  }

  const path = params.path as { tab?: unknown; subTab?: unknown };
  if (path?.tab !== EntityDetailsLeftPanelTab.RISK_INPUTS) {
    return false;
  }

  return (
    path.subTab === undefined ||
    (typeof path.subTab === 'string' &&
      Object.values(RiskScoreLeftPanelSubTab).includes(path.subTab as RiskScoreLeftPanelSubTab))
  );
}

/**
 * Wires the legacy expandable flyout into {@link RiskInputsTab}: the alert preview, and the
 * sub-tab, which is read from and written back to the left panel's URL state.
 */
const RiskInputsTabWithAlertPreview = ({
  entityType,
  entityName,
  entityId,
  scopeId,
}: RiskInputsTabWithAlertPreviewProps) => {
  const { openPreviewPanel, openLeftPanel } = useExpandableFlyoutApi();
  const panels = useStableExpandableFlyoutState();
  const subTab = isRiskScoreFlyoutPanelProps(panels.left)
    ? panels.left.params.path.subTab
    : undefined;

  // Keeps the expandable-flyout URL state in sync with the user's manual sub-tab toggle so that
  // clicking the same right-panel link again produces a URL change, which forces a remount.
  const onSubTabChange = useCallback(
    (newSubTab: RiskScoreLeftPanelSubTab) => {
      if (!isRiskScoreFlyoutPanelProps(panels.left)) return;
      openLeftPanel({
        ...panels.left,
        params: {
          ...panels.left.params,
          path: { tab: EntityDetailsLeftPanelTab.RISK_INPUTS, subTab: newSubTab },
        },
      });
    },
    [openLeftPanel, panels.left]
  );

  const onShowAlert = useCallback(
    (id: string, indexName: string) =>
      openPreviewPanel({
        id: DocumentDetailsPreviewPanelKey,
        params: {
          id,
          indexName,
          scopeId,
          isPreviewMode: true,
          banner: ALERT_PREVIEW_BANNER,
        },
      }),
    [openPreviewPanel, scopeId]
  );

  return (
    <RiskInputsTab
      entityType={entityType}
      entityName={entityName}
      entityId={entityId}
      onShowAlert={onShowAlert}
      subTab={subTab}
      onSubTabChange={onSubTabChange}
    />
  );
};

export const getRiskInputTab = ({
  entityType,
  entityName,
  scopeId,
  entityId,
}: RiskInputsTabWithAlertPreviewProps) => ({
  id: EntityDetailsLeftPanelTab.RISK_INPUTS,
  'data-test-subj': RISK_INPUTS_TAB_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.flyout.entityDetails.userDetails.riskInputs.tabLabel"
      defaultMessage="Risk score"
    />
  ),
  content: (
    <RiskInputsTabWithAlertPreview
      entityType={entityType}
      entityName={entityName}
      scopeId={scopeId}
      entityId={entityId}
    />
  ),
});

export const getInsightsInputTab = ({
  field,
  value,
  entityId,
  scopeId,
  entityType,
}: {
  field: string;
  value: string;
  entityId?: string;
  scopeId: string;
  entityType?: string;
}) => {
  return {
    id: EntityDetailsLeftPanelTab.CSP_INSIGHTS,
    'data-test-subj': INSIGHTS_TAB_TEST_ID,
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.insightsDetails.insights.tabLabel"
        defaultMessage="Insights"
      />
    ),
    content: (
      <InsightsTabCsp
        value={value}
        field={field as CloudPostureEntityIdentifier}
        scopeId={scopeId}
        entityId={entityId}
        entityType={entityType}
      />
    ),
  };
};

export const getFieldsTableTab = ({ document, tableStorageKey }: FieldsTableProps) => {
  return {
    id: EntityDetailsLeftPanelTab.FIELDS_TABLE,
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.fieldsTableTab.tabLabel"
        defaultMessage="Fields"
      />
    ),
    content: <FieldsTableTab document={document} tableStorageKey={tableStorageKey} />,
    'data-test-subj': FIELDS_TABLE_TAB_TEST_ID,
  };
};

export const getResolutionGroupTab = ({
  entityId,
  entityType,
  scopeId,
}: {
  entityId: string;
  entityType: EntityStoreEntityType;
  scopeId: string;
}) => ({
  id: EntityDetailsLeftPanelTab.RESOLUTION_GROUP,
  'data-test-subj': RESOLUTION_GROUP_TAB_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.flyout.entityDetails.resolutionGroupTab.tabLabel"
      defaultMessage="Resolution"
    />
  ),
  content: <ResolutionGroupTab entityId={entityId} entityType={entityType} scopeId={scopeId} />,
});

export const getAnomaliesTab = ({
  entityId,
  entityName,
  entityType,
}: {
  entityId: string;
  entityName: string;
  entityType: EntityStoreEntityType;
}) => ({
  id: EntityDetailsLeftPanelTab.ANOMALIES,
  'data-test-subj': ANOMALIES_TAB_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.flyout.entityDetails.anomalyTab.tabLabel"
      defaultMessage="Behavioral anomalies"
    />
  ),
  content: <AnomaliesTab entityId={entityId} entityName={entityName} entityType={entityType} />,
});
