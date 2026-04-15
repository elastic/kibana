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
import { getOrEmptyTagFromValue } from '../../common/components/empty_value';
import { flyoutProviders } from '../../flyout_v2/shared/components/flyout_provider';
import { defaultToolsFlyoutProperties } from '../../flyout_v2/shared/hooks/use_default_flyout_properties';
import { buildFlyoutContent } from '../../flyout_v2/shared/utils/build_flyout_content';
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

  const handleClick = useCallback(
    (ip: string) => {
      const flyoutContent = buildFlyoutContent(props.columnId, ip, ONE_DISCOVER_SCOPE_ID);
      if (flyoutContent) {
        overlays.openSystemFlyout(
          flyoutProviders({
            services,
            store,
            history,
            children: flyoutContent,
          }),
          {
            ...defaultToolsFlyoutProperties,
            size: 's',
            session: 'start',
          }
        );
      }
    },
    [overlays, services, store, history, props.columnId]
  );

  if (addresses.length === 0) {
    return getOrEmptyTagFromValue(null);
  }

  return (
    <>
      {addresses.map((ip, idx) => (
        <EuiLink
          key={`${ip}-${idx}`}
          onClick={() => handleClick(ip)}
          data-test-subj="one-discover-ip-link"
        >
          {ip}
        </EuiLink>
      ))}
    </>
  );
};

export const IpCellRenderer = React.memo(IpCellRendererComponent);
