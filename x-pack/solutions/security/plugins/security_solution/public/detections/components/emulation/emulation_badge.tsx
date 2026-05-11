/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const ALERT_EMULATION_ID = 'kibana.alert.emulation.id';

export const EMULATION_BADGE_TEST_ID = 'emulation-badge';
export const EMULATION_BADGE_TOOLTIP_TEST_ID = 'emulation-badge-tooltip';

export interface EmulationBadgeProps {
  emulationId?: string;
}

export const EmulationBadge = React.memo<EmulationBadgeProps>(({ emulationId }) => {
  if (!emulationId) {
    return null;
  }

  const tooltipContent = i18n.translate(
    'xpack.securitySolution.detectionEngine.emulation.badgeTooltip',
    {
      defaultMessage: 'This alert was generated during an emulation run: {emulationId}',
      values: { emulationId },
    }
  );

  // I14: wrap in EuiToolTip so the tooltip is keyboard- and screen-reader-
  // accessible. The native `title` attribute on EuiBadge is not exposed to
  // assistive tech in a consistent way and is invisible to keyboard-only
  // users. EuiToolTip handles focus and announces via aria-describedby.
  return (
    <EuiToolTip content={tooltipContent} data-test-subj={EMULATION_BADGE_TOOLTIP_TEST_ID}>
      <EuiBadge color="hollow" data-test-subj={EMULATION_BADGE_TEST_ID} tabIndex={0}>
        {i18n.translate('xpack.securitySolution.detectionEngine.emulation.badgeLabel', {
          defaultMessage: 'EMULATION',
        })}
      </EuiBadge>
    </EuiToolTip>
  );
});

EmulationBadge.displayName = 'EmulationBadge';
