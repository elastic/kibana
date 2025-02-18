/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { Connector, ConnectorStatus } from '@kbn/search-connectors';
import { ConnectorSchedulingComponent } from '@kbn/search-connectors/components/scheduling/connector_scheduling';
import { useConnectorScheduling } from '../../../hooks/api/use_update_connector_scheduling';

interface ConnectorSchedulingPanels {
  canManageConnectors: boolean;
  connector: Connector;
}
export const ConnectorScheduling: React.FC<ConnectorSchedulingPanels> = ({
  canManageConnectors,
  connector,
}) => {
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const { isLoading, mutate } = useConnectorScheduling(connector.id);
  const hasIncrementalSyncFeature = connector?.features?.incremental_sync ?? false;
  const shouldShowIncrementalSync =
    hasIncrementalSyncFeature && (connector?.features?.incremental_sync?.enabled ?? false);
  return (
    <>
      <ConnectorSchedulingComponent
        connector={connector}
        isDisabled={!canManageConnectors}
        dataTelemetryIdPrefix="serverlessSearch"
        hasChanges={hasChanges}
        hasIngestionError={connector?.status === ConnectorStatus.ERROR}
        hasPlatinumLicense={false}
        setHasChanges={setHasChanges}
        shouldShowAccessControlSync={false}
        shouldShowIncrementalSync={shouldShowIncrementalSync}
        updateConnectorStatus={isLoading}
        updateScheduling={mutate}
      />
    </>
  );
};
