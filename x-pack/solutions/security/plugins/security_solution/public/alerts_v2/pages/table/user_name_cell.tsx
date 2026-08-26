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
 * Renders the user name as a link that opens the flyout_v2 user entity flyout —
 * mirroring the v1 alerts table's user cell. New flyout only.
 */
export const UserNameCell = ({ row }: CellProps) => {
  const { openUserFlyout } = useFlyoutApi();

  const raw = row.flattened['user.name'];
  const userName = Array.isArray(raw) ? String(raw[0] ?? '') : String(raw ?? '');

  const onClick = useCallback(() => {
    if (userName) {
      openUserFlyout({ userName, scopeId: SCOPE_ID });
    }
  }, [openUserFlyout, userName]);

  if (!userName) {
    return <>{'—'}</>;
  }

  return (
    <EuiLink onClick={onClick} data-test-subj="alertsV2UserNameLink">
      {userName}
    </EuiLink>
  );
};
