/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../hooks/use_kibana';
import { useConnectorsByType } from './use_connectors_by_type';
import { SandboxConnectorsError } from './sandbox_connectors_error';
import { ConnectTypeCard } from './connect_type_card';
import { TelemetryConnectorCard } from './telemetry_connector_card';
import { sourceGridStyles } from './source_grid_styles';

/** The two pages of the "Add data" onboarding step. */
export type ConnectSourcesGroup = 'telemetry' | 'additional';

const TELEMETRY_TYPE_IDS = new Set(['.new_relic']);

const typesLoadErrorTitle = i18n.translate('xpack.nightshift.connectSources.loadError', {
  defaultMessage: 'Could not load the connector types.',
});

export function ConnectSourcesGrid({
  group,
  trailing,
}: {
  group: ConnectSourcesGroup;
  trailing?: React.ReactNode;
}): React.ReactElement | null {
  const { triggersActionsUi } = useKibana().services;
  const { groups, telemetryConnectors, isLoading, error, typesError, refetch } =
    useConnectorsByType();

  if (isLoading) return <EuiLoadingSpinner size="m" />;
  if (error) {
    return (
      <SandboxConnectorsError
        title={typesError ? typesLoadErrorTitle : undefined}
        onRetry={refetch}
        data-test-subj="nightshiftConnectSourcesError"
      />
    );
  }
  const isTelemetry = group === 'telemetry';
  const shown = triggersActionsUi
    ? groups.filter(({ actionType }) => TELEMETRY_TYPE_IDS.has(actionType.id) === isTelemetry)
    : [];
  const leading = isTelemetry ? telemetryConnectors : [];
  if (shown.length === 0 && leading.length === 0 && !trailing) return null;

  return (
    <div
      css={sourceGridStyles}
      role="list"
      aria-label={i18n.translate('xpack.nightshift.connectSources.gridLabel', {
        defaultMessage: 'Connector types the investigation agent can use',
      })}
      data-test-subj="nightshiftConnectSourcesGrid"
    >
      {leading.map((connector) => (
        <TelemetryConnectorCard key={connector.id} connector={connector} />
      ))}
      {shown.map((typeGroup) => (
        <ConnectTypeCard key={typeGroup.actionType.id} group={typeGroup} />
      ))}
      {trailing}
    </div>
  );
}
