/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiLink } from '@elastic/eui';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import { useHistory } from 'react-router-dom';
import { FlowTargetSourceDest } from '../../../common/search_strategy/security_solution/network';
import { NetworkPanel } from '../../flyout_v2/network_details';
import { getOrEmptyTagFromValue } from '../../common/components/empty_value';
import { flyoutProviders } from '../../flyout_v2/shared/components/flyout_provider';
import { defaultToolsFlyoutProperties } from '../../flyout_v2/shared/hooks/use_default_flyout_properties';
import type { StartServices } from '../../types';
import type { SecurityAppStore } from '../../common/store/types';
import { ONE_DISCOVER_SCOPE_ID } from '../constants';

export interface IpCellRendererProps extends DataGridCellValueElementProps {
  services: StartServices;
  store: SecurityAppStore;
}

const IpCellRendererComponent: React.FC<IpCellRendererProps> = ({ services, store, ...props }) => {
  const history = useHistory();
  const { overlays } = services;
  const rawValue = props.row.flattened[props.columnId];

  const addresses: string[] = useMemo(() => {
    if (Array.isArray(rawValue)) return rawValue.map(String);
    if (rawValue != null) return [String(rawValue)];
    return [];
  }, [rawValue]);

  const flowTarget = useMemo(
    () =>
      props.columnId.includes(FlowTargetSourceDest.destination)
        ? FlowTargetSourceDest.destination
        : FlowTargetSourceDest.source,
    [props.columnId]
  );

  const handleClick = useCallback(
    (ip: string) => {
      overlays.openSystemFlyout(
        flyoutProviders({
          services,
          store,
          history,
          children: (
            <NetworkPanel ip={ip} flowTarget={flowTarget} scopeId={ONE_DISCOVER_SCOPE_ID} />
          ),
        }),
        {
          ...defaultToolsFlyoutProperties,
          size: 's',
          session: 'start',
        }
      );
    },
    [overlays, services, store, history, flowTarget]
  );

  if (addresses.length === 0) {
    return getOrEmptyTagFromValue(null);
  }

  return (
    <>
      {addresses.map((ip) => (
        <EuiLink key={ip} onClick={() => handleClick(ip)} data-test-subj="one-discover-ip-link">
          {ip}
        </EuiLink>
      ))}
    </>
  );
};

export const IpCellRenderer = React.memo(IpCellRendererComponent);
