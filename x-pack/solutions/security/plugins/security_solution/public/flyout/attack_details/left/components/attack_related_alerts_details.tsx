/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { CorrelationsDetailsAlertsTable } from '../../../../flyout_v2/correlations/components/correlations_details_alerts_table';
import { useOriginalAlertIds } from '../../hooks/use_original_alert_ids';
import { useAttackDetailsContext } from '../../context';
import { ATTACK_DETAILS_LEFT_INSIGHTS_CORRELATION_TABLE } from '../../constants/test_ids';
import { getColumns } from '../../../../flyout_v2/correlations/utils/get_columns';
import { ALERT_PREVIEW_BANNER } from '../../../document_details/preview/constants';
import { DocumentDetailsPreviewPanelKey } from '../../../document_details/shared/constants/panel_keys';

/**
 * Related alerts table for the Attack Details flyout left panel Correlation tab.
 * Renders all alerts that belong to the current attack using the same table as document_details.
 */
export const AttackRelatedAlertsDetails: React.FC = memo(() => {
  const { scopeId, attackId } = useAttackDetailsContext();
  const alertIds = useOriginalAlertIds();
  const { openPreviewPanel } = useExpandableFlyoutApi();

  const onShowAlert = useCallback(
    (id: string, indexName: string) =>
      openPreviewPanel({
        id: DocumentDetailsPreviewPanelKey,
        params: { id, indexName, scopeId, isPreviewMode: true, banner: ALERT_PREVIEW_BANNER },
      }),
    [openPreviewPanel, scopeId]
  );

  const columns = useMemo(
    () =>
      getColumns({
        scopeId,
        dataTestSubj: ATTACK_DETAILS_LEFT_INSIGHTS_CORRELATION_TABLE,
        onShowAlert,
      }),
    [scopeId, onShowAlert]
  );

  return (
    <CorrelationsDetailsAlertsTable
      title={
        <FormattedMessage
          id="xpack.securitySolution.flyout.attackDetails.left.insights.correlations.relatedAlertsTitle"
          defaultMessage="{count} {count, plural, one {alert} other {alerts}} related by ancestry"
          values={{ count: alertIds.length }}
        />
      }
      loading={false}
      alertIds={alertIds}
      scopeId={scopeId}
      eventId={attackId}
      noItemsMessage={
        <FormattedMessage
          id="xpack.securitySolution.flyout.attackDetails.left.insights.correlations.noRelatedAlerts"
          defaultMessage="No related alerts."
        />
      }
      columns={columns}
      data-test-subj={ATTACK_DETAILS_LEFT_INSIGHTS_CORRELATION_TABLE}
    />
  );
});

AttackRelatedAlertsDetails.displayName = 'AttackRelatedAlertsDetails';
