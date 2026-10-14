/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const DEVELOPER_MODE_BADGE_LABEL = i18n.translate(
  'xpack.significantEventsApp.developerModeBadge.label',
  { defaultMessage: 'Dev' }
);

export const DEVELOPER_MODE_BADGE_TOOLTIP = i18n.translate(
  'xpack.significantEventsApp.developerModeBadge.tooltip',
  { defaultMessage: 'Only visible in Nightshift developer mode' }
);

export function DeveloperModeBadge() {
  return (
    <EuiToolTip content={DEVELOPER_MODE_BADGE_TOOLTIP}>
      <EuiBadge color="hollow" tabIndex={0} data-test-subj="nightshiftDeveloperModeBadge">
        {DEVELOPER_MODE_BADGE_LABEL}
      </EuiBadge>
    </EuiToolTip>
  );
}
