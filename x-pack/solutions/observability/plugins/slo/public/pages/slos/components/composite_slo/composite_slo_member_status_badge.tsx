/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CompositeSLOMemberWithSummary } from '@kbn/slo-schema';
import React from 'react';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { displayStatus } from '../../../../components/slo/slo_badges/slo_status_badge';

export function MemberStatusBadge({ status }: { status: CompositeSLOMemberWithSummary['status'] }) {
  const statusInfo = displayStatus[status];
  if (!statusInfo) {
    return <>{NOT_AVAILABLE_LABEL}</>;
  }
  if (status === 'NO_DATA') {
    return (
      <EuiToolTip
        position="top"
        content={i18n.translate('xpack.slo.compositeSloList.members.statusNoDataTooltip', {
          defaultMessage:
            'It may take some time before the data is aggregated and available for this member SLO.',
        })}
      >
        <EuiBadge tabIndex={0} color={statusInfo.badgeColor}>
          {statusInfo.displayText}
        </EuiBadge>
      </EuiToolTip>
    );
  }
  return <EuiBadge color={statusInfo.badgeColor}>{statusInfo.displayText}</EuiBadge>;
}
