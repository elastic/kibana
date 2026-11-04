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
import { sourceGridStyles } from './source_grid_styles';

/** Telemetry types for Add data; other types for Connect other sources. */
export type ConnectSourcesGroup = 'telemetry' | 'additional';

/** The connector types that read telemetry; the other sandbox-capable types are additional sources. */
export const TELEMETRY_TYPE_IDS = new Set(['.elasticsearch', '.new_relic']);

/** Hidden from "Connect other sources" for local onboarding screenshots. */
export const HIDDEN_ADDITIONAL_TYPE_IDS = new Set(['.http']);

/** True when the group has at least one connector assigned to the investigation agent. */
export function groupHasConnector(
  groups: Array<{ actionType: { id: string }; assignedCount: number }>,
  group: ConnectSourcesGroup
): boolean {
  const wantTelemetry = group === 'telemetry';
  return groups.some(({ actionType, assignedCount }) => {
    const isTelemetry = TELEMETRY_TYPE_IDS.has(actionType.id);
    if (isTelemetry !== wantTelemetry) return false;
    if (!wantTelemetry && HIDDEN_ADDITIONAL_TYPE_IDS.has(actionType.id)) return false;
    return assignedCount > 0;
  });
}

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
  const isTelemetry = group === 'telemetry';
  const shown = triggersActionsUi
    ? groups.filter(({ actionType }) => {
        const isTelemetryType = TELEMETRY_TYPE_IDS.has(actionType.id);
        if (isTelemetryType !== isTelemetry) return false;
        if (!isTelemetry && HIDDEN_ADDITIONAL_TYPE_IDS.has(actionType.id)) return false;
        return true;
      })
    : [];
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
