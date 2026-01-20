/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { TableId } from '@kbn/securitysolution-data-table';

const HostPanelKey: HostPanelExpandableFlyoutProps['key'] = 'host-panel';

interface HostPanelProps extends Record<string, unknown> {
  contextID: string;
  scopeId: string;
  entityIdentifiers: Record<string, string>;
}

interface HostPanelExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'host-panel';
  params: HostPanelProps;
}

export const isHostName = (fieldName: string) =>
  fieldName === 'host.name' || fieldName === 'host.hostname';

export const getHostFlyoutPanelProps = ({
  contextId,
  entityIdentifiers,
}: {
  contextId: string;
  entityIdentifiers: Record<string, string>;
}): FlyoutPanelProps => ({
  id: HostPanelKey,
  params: {
    entityIdentifiers,
    contextID: contextId,
    scopeId: TableId.alertsOnAlertsPage,
  },
});
