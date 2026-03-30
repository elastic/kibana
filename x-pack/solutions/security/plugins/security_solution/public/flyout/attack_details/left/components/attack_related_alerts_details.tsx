/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { CorrelationsDetailsAlertsTable } from '../../../document_details/left/components/correlations_details_alerts_table';
import { useOriginalAlertIds } from '../../hooks/use_original_alert_ids';
import { useAttackDetailsContext } from '../../context';
import { ATTACK_DETAILS_LEFT_INSIGHTS_CORRELATION_TABLE } from '../../constants/test_ids';

/**
 * Related alerts table for the Attack Details flyout left panel Correlation tab.
 * Renders all alerts that belong to the current attack using the same table as document_details.
 */
export const AttackRelatedAlertsDetails: React.FC = memo(() => {
  const { scopeId, attackId } = useAttackDetailsContext();
  const alertIds = useOriginalAlertIds();

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
      data-test-subj={ATTACK_DETAILS_LEFT_INSIGHTS_CORRELATION_TABLE}
    />
  );
});

AttackRelatedAlertsDetails.displayName = 'AttackRelatedAlertsDetails';
