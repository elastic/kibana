/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiButtonGroup, EuiSpacer } from '@elastic/eui';
import type { EuiButtonGroupOptionProps } from '@elastic/eui/src/components/button/button_group/button_group';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { DataTableRecord } from '@kbn/discover-utils';
import { AttackEntitiesDetails } from '../../../flyout_v2/attack_details/tools/entities/components/attack_entities_details';
import { AttackRelatedAlertsDetails } from '../../../flyout_v2/attack_details/tools/correlations/components/attack_related_alerts_details';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { ALERT_PREVIEW_BANNER } from '../../document_details/preview/constants';
import { DocumentDetailsPreviewPanelKey } from '../../document_details/shared/constants/panel_keys';
import { AttackDetailsLeftPanelKey } from '../constants/panel_keys';
import {
  CORRELATION_TAB_ID,
  ENTITIES_TAB_ID,
  INSIGHTS_TAB_ID,
} from '../constants/left_panel_paths';

const SUB_TAB_BUTTONS: EuiButtonGroupOptionProps[] = [
  {
    id: ENTITIES_TAB_ID,
    label: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.attackDetails.left.insights.entitiesButtonLabel"
        defaultMessage="Entities"
      />
    ),
    'data-test-subj': 'attack-details-left-insights-entities-button',
  },
  {
    id: CORRELATION_TAB_ID,
    label: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.attackDetails.left.insights.correlationsButtonLabel"
        defaultMessage="Correlation"
      />
    ),
    'data-test-subj': 'attack-details-left-insights-correlation-button',
  },
];

const LEGEND = i18n.translate(
  'xpack.securitySolution.flyout.attackDetails.left.insights.buttonGroupLegend',
  { defaultMessage: 'Insights options' }
);

export interface InsightsSubPanelProps {
  hit: DataTableRecord;
  attackId: string;
  indexName: string;
  subTab: string;
}

/**
 * Sub-panel rendered inside the Insights tab of the legacy left panel.
 * Hosts the Entities / Correlation button group and forwards `hit` to the
 * v2 attack-tools content components. Opening an alert preview from the
 * Correlation sub-tab uses the legacy `openPreviewPanel` flow so the
 * preview surface stays consistent with the rest of the legacy flyout.
 */
export const InsightsSubPanel: React.FC<InsightsSubPanelProps> = memo(
  ({ hit, attackId, indexName, subTab }) => {
    const { openLeftPanel, openPreviewPanel } = useExpandableFlyoutApi();
    const scopeId = useSpaceId() ?? '';

    const setSubTab = useCallback(
      (nextSubTab: string) =>
        openLeftPanel({
          id: AttackDetailsLeftPanelKey,
          params: { attackId, indexName },
          path: { tab: INSIGHTS_TAB_ID, subTab: nextSubTab },
        }),
      [attackId, indexName, openLeftPanel]
    );

    const onShowAlert = useCallback(
      (id: string, alertIndexName: string) =>
        openPreviewPanel({
          id: DocumentDetailsPreviewPanelKey,
          params: {
            id,
            indexName: alertIndexName,
            scopeId,
            isPreviewMode: true,
            banner: ALERT_PREVIEW_BANNER,
          },
        }),
      [openPreviewPanel, scopeId]
    );

    return (
      <>
        <EuiButtonGroup
          color="primary"
          legend={LEGEND}
          options={SUB_TAB_BUTTONS}
          idSelected={subTab}
          onChange={setSubTab}
          buttonSize="compressed"
          isFullWidth
          data-test-subj="attack-details-left-insights-button-group"
        />
        <EuiSpacer size="m" />
        {subTab === ENTITIES_TAB_ID && <AttackEntitiesDetails hit={hit} />}
        {subTab === CORRELATION_TAB_ID && (
          <AttackRelatedAlertsDetails hit={hit} onShowAlert={onShowAlert} />
        )}
      </>
    );
  }
);

InsightsSubPanel.displayName = 'InsightsSubPanel';
