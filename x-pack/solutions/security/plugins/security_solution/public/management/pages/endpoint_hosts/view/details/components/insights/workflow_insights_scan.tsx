/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, EuiToolTip } from '@elastic/eui';
import {
  DEFEND_INSIGHTS_STORAGE_KEY,
  ConnectorSelectorInline,
  DEFAULT_ASSISTANT_NAMESPACE,
  useLoadConnectors,
} from '@kbn/elastic-assistant';
import { noop } from 'lodash/fp';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { some } from 'lodash';
import { AssistantIcon } from '@kbn/ai-assistant-icon';
import { useUserPrivileges } from '../../../../../../../common/components/user_privileges';
import { useSpaceId } from '../../../../../../../common/hooks/use_space_id';
import { WORKFLOW_INSIGHTS } from '../../../translations';
import { useKibana } from '../../../../../../../common/lib/kibana';

interface WorkflowInsightsScanSectionProps {
  isScanButtonDisabled: boolean;
  onScanButtonClick: ({
    actionTypeId,
    connectorId,
  }: {
    actionTypeId: string;
    connectorId: string;
  }) => void;
}

export const WorkflowInsightsScanSection = ({
  isScanButtonDisabled,
  onScanButtonClick,
}: WorkflowInsightsScanSectionProps) => {
  const CONNECTOR_ID_LOCAL_STORAGE_KEY = 'connectorId';

  const spaceId = useSpaceId() ?? 'default';
  const { http } = useKibana().services;
  const { data: aiConnectors } = useLoadConnectors({
    http,
  });
  const { canWriteWorkflowInsights } = useUserPrivileges().endpointPrivileges;

  // Store the selected connector id in local storage so that it persists across page reloads
  const [localStorageWorkflowInsightsConnectorId, setLocalStorageWorkflowInsightsConnectorId] =
    useLocalStorage<string>(
      `${DEFAULT_ASSISTANT_NAMESPACE}.${DEFEND_INSIGHTS_STORAGE_KEY}.${spaceId}.${CONNECTOR_ID_LOCAL_STORAGE_KEY}`
    );

  const [connectorId, setConnectorId] = React.useState<string | undefined>(
    localStorageWorkflowInsightsConnectorId
  );

  const onConnectorIdSelected = useCallback(
    (selectedConnectorId: string) => {
      setConnectorId(selectedConnectorId);
      setLocalStorageWorkflowInsightsConnectorId(selectedConnectorId);
    },
    [setLocalStorageWorkflowInsightsConnectorId]
  );

  // Check if the selected connector exists in the list of connectors, i.e. it is not deleted
  const connectorExists = useMemo(
    () => some(aiConnectors, ['id', connectorId]),
    [aiConnectors, connectorId]
  );

  const selectedConnectorActionTypeId = useMemo(() => {
    const selectedConnector = aiConnectors?.find((connector) => connector.id === connectorId);
    return selectedConnector?.actionTypeId;
  }, [aiConnectors, connectorId]);

  // Render the scan button only if a connector is selected
  const scanButton = useMemo(() => {
    if (!connectorExists) {
      return null;
    }

    const button = (
      <EuiFlexItem grow={false}>
        <EuiButton
          data-test-subj="workflowInsightsScanButton"
          size="s"
          isLoading={isScanButtonDisabled}
          isDisabled={!canWriteWorkflowInsights}
          onClick={() => {
            if (!connectorId || !selectedConnectorActionTypeId) return;
            onScanButtonClick({ connectorId, actionTypeId: selectedConnectorActionTypeId });
          }}
        >
          {isScanButtonDisabled ? WORKFLOW_INSIGHTS.scan.loading : WORKFLOW_INSIGHTS.scan.button}
        </EuiButton>
      </EuiFlexItem>
    );

    if (!canWriteWorkflowInsights) {
      return (
        <EuiToolTip content={WORKFLOW_INSIGHTS.scan.noPermissions} position={'top'}>
          {button}
        </EuiToolTip>
      );
    }
    return button;
  }, [
    canWriteWorkflowInsights,
    connectorExists,
    connectorId,
    isScanButtonDisabled,
    onScanButtonClick,
    selectedConnectorActionTypeId,
  ]);

  return (
    <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <AssistantIcon />
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
              <ConnectorSelectorInline
                onConnectorSelected={noop}
                onConnectorIdSelected={onConnectorIdSelected}
                selectedConnectorId={connectorId}
              />
            </EuiFlexItem>
            {scanButton}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
