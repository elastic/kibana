/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';

export interface Props {
  slo: SLOWithSummaryResponse;
}

export function SloStateBadge({ slo }: Props) {
  const isEnabled = slo.enabled;
  if (isEnabled) {
    return null;
  }

  return (
    <EuiFlexItem grow={false}>
      <EuiToolTip
        position="top"
        content={i18n.translate('xpack.slo.sloStateBadge.disabled.tooltip', {
          defaultMessage: 'This SLO is disabled. Enable it to start processing data.',
        })}
      >
        <EuiBadge color="default" tabIndex={0}>
          {i18n.translate('xpack.slo.sloStateBadge.disabled.label', {
            defaultMessage: 'Disabled',
          })}
        </EuiBadge>
      </EuiToolTip>
    </EuiFlexItem>
  );
}
