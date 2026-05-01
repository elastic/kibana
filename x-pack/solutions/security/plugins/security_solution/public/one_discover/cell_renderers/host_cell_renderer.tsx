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
import { DataViewManagerBootstrap } from '../alert_flyout_overview_tab_component/data_view_manager_bootstrap';
import { Host } from '../../flyout_v2/entity_details/host';
import type { StartServices } from '../../types';
import type { SecurityAppStore } from '../../common/store/types';

export const HOST_CELL_RENDERER_FIELDS = new Set(['host.name', 'host.hostname']);

const getFirstValue = (raw: unknown): string | undefined => {
  if (Array.isArray(raw)) return raw.length > 0 ? String(raw[0]) : undefined;
  if (raw != null) return String(raw);
  return undefined;
};

export interface HostCellRendererProps extends DataGridCellValueElementProps {
  services: StartServices;
  store: SecurityAppStore;
}

/**
 * Cell renderer for host-related columns in One Discover.
 * Renders each value as a clickable link that opens the host details flyout.
 */
export const HostCellRenderer = React.memo<HostCellRendererProps>(
  ({ services, store, ...props }) => {
    const history = useHistory();
    const { overlays } = services;
    const rawValue = props.row.flattened[props.columnId];

    const values: string[] = useMemo(() => {
      if (Array.isArray(rawValue)) return rawValue.map(String);
      if (rawValue != null) return [String(rawValue)];
      return [];
    }, [rawValue]);

    const handleClick = useCallback(
      (clickedValue: string) => {
        const { flattened } = props.row;

        const hostName = clickedValue;
        const entityId =
          getFirstValue(flattened['host.entity.id']) ?? getFirstValue(flattened['entity.id']);

        if (!hostName && !entityId) return;

        overlays.openSystemFlyout(
          flyoutProviders({
            services,
            store,
            history,
            children: (
              <>
                <DataViewManagerBootstrap />
                <Host hostName={hostName} entityId={entityId} />
              </>
            ),
          }),
          {
            ...defaultToolsFlyoutProperties,
            size: 's',
            session: 'start',
          }
        );
      },
      [overlays, services, store, history, props.row]
    );

    if (values.length === 0) {
      return getOrEmptyTagFromValue(null);
    }

    return (
      <>
        {values.map((val, idx) => (
          <React.Fragment key={`${val}-${idx}`}>
            {idx > 0 && ', '}
            <EuiLink onClick={() => handleClick(val)} data-test-subj="one-discover-host-link">
              {val}
            </EuiLink>
          </React.Fragment>
        ))}
      </>
    );
  }
);

HostCellRenderer.displayName = 'HostCellRenderer';
