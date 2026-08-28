/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import type { RemoteMonitorInfo } from '../../../../../../common/runtime_types';
import { getRemoteBadgeLabel } from '../../../utils/remote/remote_origin_copy';

export function SyntheticsRemoteBadge({ remote }: { remote?: RemoteMonitorInfo }) {
  if (!remote) {
    return null;
  }

  return (
    <EuiToolTip content={remote.kibanaUrl || undefined} title={remote.remoteName}>
      <EuiBadge
        tabIndex={0}
        color="default"
        data-test-subj="syntheticsRemoteBadge"
        onMouseDown={(e: React.MouseEvent) => {
          e.stopPropagation();
        }}
      >
        {getRemoteBadgeLabel()}
      </EuiBadge>
    </EuiToolTip>
  );
}
