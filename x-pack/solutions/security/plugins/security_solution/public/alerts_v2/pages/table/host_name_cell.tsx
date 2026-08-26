/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiLink } from '@elastic/eui';
import type { CustomCellRenderer } from '@kbn/unified-data-table';
import { useFlyoutApi } from '../../../flyout_v2/use_flyout_api';

type CellProps = Parameters<CustomCellRenderer[string]>[0];

/** Flyout scope for the Alerts v2 page. */
const SCOPE_ID = 'alerts-v2';

/**
 * Renders the host name as a link that opens the flyout_v2 host entity flyout —
 * mirroring the v1 alerts table's host cell. New flyout only (we ignore the
 * legacy expandable-flyout branch).
 */
export const HostNameCell = ({ row }: CellProps) => {
  const { openHostFlyout } = useFlyoutApi();

  const raw = row.flattened['host.name'];
  const hostName = Array.isArray(raw) ? String(raw[0] ?? '') : String(raw ?? '');

  const onClick = useCallback(() => {
    if (hostName) {
      openHostFlyout({ hostName, scopeId: SCOPE_ID });
    }
  }, [openHostFlyout, hostName]);

  if (!hostName) {
    return <>{'—'}</>;
  }

  return (
    <EuiLink onClick={onClick} data-test-subj="alertsV2HostNameLink">
      {hostName}
    </EuiLink>
  );
};
