/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RemoteMonitorInfo } from '../../../../../../common/runtime_types';

export function SyntheticsRemoteBadge({ remote }: { remote?: RemoteMonitorInfo }) {
  if (!remote) {
    return null;
  }

  const tooltipContent = remote.kibanaUrl
    ? i18n.translate('xpack.synthetics.remoteBadge.tooltipWithUrl', {
        defaultMessage: 'Remote cluster: {remoteName} ({kibanaUrl})',
        values: { remoteName: remote.remoteName, kibanaUrl: remote.kibanaUrl },
      })
    : i18n.translate('xpack.synthetics.remoteBadge.tooltip', {
        defaultMessage: 'Remote cluster: {remoteName}',
        values: { remoteName: remote.remoteName },
      });

  return (
    <EuiToolTip content={tooltipContent}>
      <EuiBadge
        color="hollow"
        data-test-subj="syntheticsRemoteBadge"
        onMouseDown={(e: React.MouseEvent) => {
          e.stopPropagation();
        }}
      >
        {remote.remoteName}
      </EuiBadge>
    </EuiToolTip>
  );
}
