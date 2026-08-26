/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiLink } from '@elastic/eui';
import type { CustomCellRenderer } from '@kbn/unified-data-table';
import { FlowTargetSourceDest } from '../../../../common/search_strategy/security_solution/network';
import { useFlyoutApi } from '../../../flyout_v2/use_flyout_api';

type CellProps = Parameters<CustomCellRenderer[string]>[0];

/** Maps the ip column to the network flyout's flow target. */
const FLOW_TARGET_BY_COLUMN: Record<string, FlowTargetSourceDest> = {
  'source.ip': FlowTargetSourceDest.source,
  'destination.ip': FlowTargetSourceDest.destination,
};

/**
 * Renders an ip (source.ip / destination.ip) as a link that opens the flyout_v2
 * network flyout — one component for both columns, keyed by `columnId` to pick
 * the flow target. New flyout only.
 */
export const NetworkIpCell = ({ row, columnId }: CellProps) => {
  const { openNetworkFlyout } = useFlyoutApi();

  const raw = row.flattened[columnId];
  const ip = Array.isArray(raw) ? String(raw[0] ?? '') : String(raw ?? '');
  const flowTarget = FLOW_TARGET_BY_COLUMN[columnId] ?? FlowTargetSourceDest.source;

  const onClick = useCallback(() => {
    if (ip) {
      openNetworkFlyout({ ip, flowTarget });
    }
  }, [openNetworkFlyout, ip, flowTarget]);

  if (!ip) {
    return <>{'—'}</>;
  }

  return (
    <EuiLink onClick={onClick} data-test-subj="alertsV2NetworkIpLink">
      {ip}
    </EuiLink>
  );
};
