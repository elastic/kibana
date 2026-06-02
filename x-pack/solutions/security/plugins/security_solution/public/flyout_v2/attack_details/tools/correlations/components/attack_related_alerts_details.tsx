/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { CorrelationsDetailsAlertsTable } from '../../../../document/tools/correlations/components/correlations_details_alerts_table';
import { useHeaderData } from '../../../main/hooks/use_header_data';
import { useSpaceId } from '../../../../../common/hooks/use_space_id';
import { getColumns } from '../../../../document/tools/correlations/utils/get_columns';
import { ATTACK_CORRELATIONS_RELATED_ALERTS_TABLE_TEST_ID } from '../../../main/constants/test_ids';

export interface AttackRelatedAlertsDetailsProps {
  /**
   * Parsed attack-discovery alert resolved by {@link useAttackDetails}.
   * `originalAlertIds` and `attackId` (used as `eventId` on the table) are
   * derived from `attack`.
   */
  attack: AttackDiscoveryAlert;
  /**
   * Callback invoked when the preview button on an alert row is clicked.
   * The v2 wiring opens the alert in a child document flyout via
   * `overlays.openSystemFlyout(<DocumentFlyoutWrapper .../>)`, replacing the
   * legacy `useExpandableFlyoutApi().openPreviewPanel` call.
   */
  onShowAlert: (id: string, indexName: string) => void;
  /**
   * When `true`, the rule cell in the related-alerts table renders a legacy
   * `<PreviewLink>` that opens the rule preview via the expandable-flyout
   * `openPreviewPanel` API. When `false` (default), it renders a v2
   * `<ChildLink>` that opens the rule details as a system flyout.
   *
   * Pass `true` from the legacy attack-details left panel
   * (`flyout/attack_details/left/insights_sub_panel.tsx`) so the rule link
   * routes through the legacy expandable flyout consistent with the
   * surrounding chrome; leave it `false` (the default) for the v2
   * attack-correlations child flyout.
   */
  useLegacyExpandableFlyout?: boolean;
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
  ({ attack, onShowAlert, useLegacyExpandableFlyout = false }) => {
    const scopeId = useSpaceId() ?? '';
    const attackId = attack.id;
    const { originalAlertIds: alertIds } = useHeaderData(attack);

    const columns = useMemo(
      () =>
        getColumns({
          scopeId,
          dataTestSubj: ATTACK_CORRELATIONS_RELATED_ALERTS_TABLE_TEST_ID,
          onShowAlert,
          useLegacyExpandableFlyout,
        }),
      [scopeId, onShowAlert, useLegacyExpandableFlyout]
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
