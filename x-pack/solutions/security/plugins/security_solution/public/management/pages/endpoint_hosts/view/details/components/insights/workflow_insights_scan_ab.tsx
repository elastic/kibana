/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { ConnectorSelector } from '@kbn/security-solution-connectors';
import { useLoadConnectors } from '@kbn/inference-connectors';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';
import { useUserPrivileges } from '../../../../../../../common/components/user_privileges';
import { useSpaceId } from '../../../../../../../common/hooks/use_space_id';
import { useKibana } from '../../../../../../../common/lib/kibana';
import { WORKFLOW_INSIGHTS } from '../../../translations';

const CONNECTOR_ID_LOCAL_STORAGE_KEY = 'securitySolution.workflowInsightsAB.connectorId';

interface WorkflowInsightsScanSectionABProps {
  isScanButtonDisabled: boolean;
  isLoading: boolean;
  onScanButtonClick: (connectorId: string) => void;
}

export const WorkflowInsightsScanSectionAB = ({
  isScanButtonDisabled,
  isLoading,
  onScanButtonClick,
}: WorkflowInsightsScanSectionABProps) => {
  const spaceId = useSpaceId();
  const { http, settings } = useKibana().services;
  const { canWriteWorkflowInsights } = useUserPrivileges().endpointPrivileges;
  const { data: aiConnectors } = useLoadConnectors({
    http,
    featureId: 'defend_insights',
    settings,
  });

  const storageKey = `${CONNECTOR_ID_LOCAL_STORAGE_KEY}.${spaceId || 'default'}`;
  const [storedConnectorId, setStoredConnectorId] = useLocalStorage<string>(storageKey);

  // Resolve effective connector: explicit selection → Kibana default setting → first available
  const defaultConnectorId = settings.client.get<string>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR);
  const connectorId = useMemo(() => {
    const candidates = [storedConnectorId, defaultConnectorId, aiConnectors?.[0]?.id];
    return candidates.find((id) => id && aiConnectors?.some((c) => c.id === id));
  }, [storedConnectorId, defaultConnectorId, aiConnectors]);

  const onConnectorChange = useCallback(
    (id: string) => {
      setStoredConnectorId(id);
    },
    [setStoredConnectorId]
  );

  const handleScanClick = useCallback(() => {
    if (!connectorId) return;
    onScanButtonClick(connectorId);
  }, [connectorId, onScanButtonClick]);

  const button = (
    <EuiFlexItem grow={false}>
      <EuiButton
        data-test-subj="workflowInsightsScanButton"
        size="s"
        isLoading={isLoading}
        isDisabled={!canWriteWorkflowInsights || isScanButtonDisabled || !connectorId}
        onClick={handleScanClick}
        fill
      >
        {isLoading ? WORKFLOW_INSIGHTS.scan.loading : WORKFLOW_INSIGHTS.scan.button}
      </EuiButton>
    </EuiFlexItem>
  );

  return (
    <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiIcon type="sparkles" aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <h4>{WORKFLOW_INSIGHTS.scan.title}</h4>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <ConnectorSelector
                connectors={aiConnectors ?? []}
                selectedId={connectorId}
                onChange={onConnectorChange}
                isDisabled={isLoading || isScanButtonDisabled}
                settings={settings}
              />
            </EuiFlexItem>
            {canWriteWorkflowInsights ? (
              button
            ) : (
              <EuiToolTip content={WORKFLOW_INSIGHTS.scan.noPermissions} position="top">
                {button}
              </EuiToolTip>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
