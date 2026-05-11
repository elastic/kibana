/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const ALERT_EMULATION_ID = 'kibana.alert.emulation.id';

export interface EmulationBadgeProps {
  emulationId?: string;
}

export const EmulationBadge = React.memo<EmulationBadgeProps>(({ emulationId }) => {
  if (!emulationId) {
    return null;
  }

  return (
    <EuiBadge
      color="hollow"
      data-test-subj="emulation-badge"
      title={i18n.translate('xpack.securitySolution.detectionEngine.emulation.badgeTooltip', {
        defaultMessage: 'This alert was generated during an emulation run: {emulationId}',
        values: { emulationId },
      })}
    >
      {i18n.translate('xpack.securitySolution.detectionEngine.emulation.badgeLabel', {
        defaultMessage: 'EMULATION',
      })}
    </EuiBadge>
  );
});

EmulationBadge.displayName = 'EmulationBadge';
