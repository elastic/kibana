/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { CorrelationsDetailsAlertsTable } from '../../../../document/tools/correlations/components/correlations_details_alerts_table';
import { useHeaderData } from '../../../main/hooks/use_header_data';
import { useSpaceId } from '../../../../../common/hooks/use_space_id';
import { getColumns } from '../../../../document/tools/correlations/utils/get_columns';
import { ATTACK_CORRELATIONS_RELATED_ALERTS_TABLE_TEST_ID } from '../../../main/constants/test_ids';

export interface AttackRelatedAlertsDetailsProps {
  /**
   * The attack-discovery document hit. `originalAlertIds` and `attackId`
   * (used as `eventId` on the table) are derived from `hit.flattened` /
   * `hit.raw._id`.
   */
  hit: DataTableRecord;
  /**
   * Callback invoked when the preview button on an alert row is clicked.
   * The v2 wiring opens the alert in a child document flyout via
   * `overlays.openSystemFlyout(<DocumentFlyoutWrapper .../>)`, replacing the
   * legacy `useExpandableFlyoutApi().openPreviewPanel` call.
   */
  onShowAlert: (id: string, indexName: string) => void;
}

/**
 * Related-alerts table for the v2 Attack Details Correlations child flyout.
 * Mirrors the legacy `flyout/attack_details/left/components/attack_related_alerts_details.tsx`
 * but accepts `onShowAlert` as a prop instead of pulling
 * `openPreviewPanel` from `useExpandableFlyoutApi` — the parent
 * (`flyout_v2/attack_details/main/index.tsx`) wires the preview to the v2
 * system-flyout flow.
 */
export const AttackRelatedAlertsDetails: React.FC<AttackRelatedAlertsDetailsProps> = memo(
  ({ hit, onShowAlert }) => {
    const scopeId = useSpaceId() ?? '';
    const attackId = hit.raw._id ?? '';
    const { originalAlertIds: alertIds } = useHeaderData(hit);

    const columns = useMemo(
      () =>
        getColumns({
          scopeId,
          dataTestSubj: ATTACK_CORRELATIONS_RELATED_ALERTS_TABLE_TEST_ID,
          onShowAlert,
          useLegacyExpandableFlyout: false,
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
        data-test-subj={ATTACK_CORRELATIONS_RELATED_ALERTS_TABLE_TEST_ID}
      />
    );
  }
);

AttackRelatedAlertsDetails.displayName = 'AttackRelatedAlertsDetails';
