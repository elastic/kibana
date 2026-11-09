/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../hooks/use_kibana';
import { useConnectorsByType } from '../../../data/sandbox_connectors/use_connectors_by_type';
import { SandboxConnectorsError } from './sandbox_connectors_error';
import { ConnectTypeCard } from './connect_type_card';
import { sourceGridStyles } from './source_grid_styles';

/** The connector types that read telemetry: the "Add data" step. */
const TELEMETRY_TYPE_IDS = new Set(['.elasticsearch', '.new_relic']);

const HIDDEN_TYPE_IDS = new Set(['.http']);

export const isTelemetryType = (actionTypeId: string): boolean =>
  TELEMETRY_TYPE_IDS.has(actionTypeId);

/** Every other sandbox-capable type: the "Connect other sources" step. */
export const isAdditionalType = (actionTypeId: string): boolean =>
  !TELEMETRY_TYPE_IDS.has(actionTypeId) && !HIDDEN_TYPE_IDS.has(actionTypeId);

const typesLoadErrorTitle = i18n.translate('xpack.nightshift.connectSources.loadError', {
  defaultMessage: 'Could not load the connector types.',
});

export function ConnectSourcesGrid({
  filter,
  trailing,
}: {
  filter: (actionTypeId: string) => boolean;
  trailing?: React.ReactNode;
}): React.ReactElement | null {
  const { triggersActionsUi } = useKibana().services;
  const { groups, isLoading, error, typesError, refetch } = useConnectorsByType();

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
  const shown = triggersActionsUi ? groups.filter(({ actionType }) => filter(actionType.id)) : [];
  if (shown.length === 0 && !trailing) return null;

  return (
    <div
      css={sourceGridStyles}
      role="list"
      aria-label={i18n.translate('xpack.nightshift.connectSources.gridLabel', {
        defaultMessage: 'Connector types the investigation agent can use',
      })}
      data-test-subj="nightshiftConnectSourcesGrid"
    >
      {shown.map((typeGroup) => (
        <ConnectTypeCard key={typeGroup.actionType.id} group={typeGroup} />
      ))}
      {trailing}
    </div>
  );
}
