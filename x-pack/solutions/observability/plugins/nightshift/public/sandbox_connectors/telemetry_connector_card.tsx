/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { SandboxConnector } from '@kbn/nightshift-investigations-plugin/common';
import { useKibana } from '../hooks/use_kibana';
import { SourceCard } from './source_card';
import { ConnectorCountBadge } from './connector_count_badge';
import { getConnectorTypeIcon } from './connector_type_icon';

/**
 * One of the deployment's telemetry connectors, configured as a telemetry target of the sandbox.
 * The agent always has it, so the card only says so.
 */
export function TelemetryConnectorCard({
  connector,
}: {
  connector: SandboxConnector;
}): React.ReactElement {
  const registry = useKibana().services.triggersActionsUi?.actionTypeRegistry;
  const model = registry?.has(connector.connector_type_id)
    ? registry.get(connector.connector_type_id)
    : undefined;

  return (
    <SourceCard
      connected
      icon={getConnectorTypeIcon(connector.connector_type_id, registry)}
      title={connector.name}
      description={model?.actionTypeTitle ?? connector.connector_type_id}
      badge={
        <ConnectorCountBadge
          count={1}
          data-test-subj={`nightshiftTelemetryConnectorCount-${connector.id}`}
        />
      }
      data-test-subj={`nightshiftTelemetryConnectorCard-${connector.id}`}
    />
  );
}
