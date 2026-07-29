/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { AIConnector } from '@kbn/elastic-assistant';
import { useAssistantContext } from '@kbn/elastic-assistant';
import React, { useCallback, useMemo, useState } from 'react';

import { Generations } from '../../../../attack_discovery/pages/results/history/generations';
import { WorkflowExecutionDetails } from '../../../../attack_discovery/pages/loading_callout/workflow_execution_details_flyout/workflow_execution_details';
import { useGetAttackDiscoveryGenerations } from '../../../../attack_discovery/pages/use_get_attack_discovery_generations';
import { getWorkflowExecutionDetailsProps } from './get_workflow_execution_details_props';
import { usePollGenerations } from './use_poll_generations';
import * as i18n from './translations';

export const GENERATIONS_CONTROL_CENTER_FLYOUT_TEST_ID = 'generationsControlCenterFlyout';
export const GENERATIONS_CONTROL_CENTER_BACK_BUTTON_TEST_ID = 'generationsControlCenterBackButton';
export const GENERATIONS_CONTROL_CENTER_EMPTY_STATE_TEST_ID = 'generationsControlCenterEmptyState';

// Fetch up to 50 generations (no status filter) and display all non-dismissed
// ones in the control center — the flyout body scrolls for longer lists.
const GET_ATTACK_DISCOVERY_GENERATIONS_SIZE = 50;

interface Props {
  aiConnectors: AIConnector[] | undefined;
  localStorageAttackDiscoveryMaxAlerts: string | undefined;
  onClose: () => void;
}

const GenerationsControlCenterFlyoutComponent: React.FC<Props> = ({
  aiConnectors,
  localStorageAttackDiscoveryMaxAlerts,
  onClose,
}) => {
  const { assistantAvailability, http } = useAssistantContext();
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'generationsControlCenterFlyout' });

  const [selectedExecutionUuid, setSelectedExecutionUuid] = useState<string | null>(null);

  const {
    cancelRequest,
    data: generationsData,
    refetch,
  } = useGetAttackDiscoveryGenerations({
    http,
    isAssistantEnabled: assistantAvailability.isAssistantEnabled,
    size: GET_ATTACK_DISCOVERY_GENERATIONS_SIZE,
  });

  usePollGenerations({ cancelRequest, refetch });

  const selectedGeneration = useMemo(
    () =>
      selectedExecutionUuid == null
        ? undefined
        : generationsData?.generations.find(
            ({ execution_uuid: executionUuid }) => executionUuid === selectedExecutionUuid
          ),
    [generationsData?.generations, selectedExecutionUuid]
  );

  const nonDismissedCount = useMemo(
    () => generationsData?.generations.filter(({ status }) => status !== 'dismissed').length ?? 0,
    [generationsData?.generations]
  );

  const handleBack = useCallback(() => setSelectedExecutionUuid(null), []);

  const refetchGenerations = useCallback(() => {
    refetch();
  }, [refetch]);

  const isDetailMode = selectedGeneration != null;

  return (
    <EuiFlyout
      aria-labelledby={flyoutTitleId}
      data-test-subj={GENERATIONS_CONTROL_CENTER_FLYOUT_TEST_ID}
      onClose={onClose}
      size="m"
    >
      <EuiFlyoutHeader hasBorder>
        {isDetailMode && (
          <EuiButtonEmpty
            data-test-subj={GENERATIONS_CONTROL_CENTER_BACK_BUTTON_TEST_ID}
            flush="left"
            iconType="arrowLeft"
            onClick={handleBack}
            size="s"
          >
            {i18n.BACK_TO_GENERATIONS}
          </EuiButtonEmpty>
        )}

        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>
            {isDetailMode ? i18n.WORKFLOW_EXECUTION_DETAILS : i18n.GENERATIONS_TITLE}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {isDetailMode ? (
          <WorkflowExecutionDetails
            {...getWorkflowExecutionDetailsProps({
              aiConnectors,
              generation: selectedGeneration,
              localStorageAttackDiscoveryMaxAlerts,
            })}
            http={http}
            onClose={onClose}
          />
        ) : generationsData != null && nonDismissedCount === 0 ? (
          <EuiEmptyPrompt
            data-test-subj={GENERATIONS_CONTROL_CENTER_EMPTY_STATE_TEST_ID}
            title={<h2>{i18n.NO_GENERATIONS_TITLE}</h2>}
            titleSize="xs"
            body={<p>{i18n.NO_GENERATIONS_BODY}</p>}
          />
        ) : (
          <Generations
            aiConnectors={aiConnectors}
            data={generationsData}
            localStorageAttackDiscoveryMaxAlerts={localStorageAttackDiscoveryMaxAlerts}
            maxItems={GET_ATTACK_DISCOVERY_GENERATIONS_SIZE}
            onViewDetails={setSelectedExecutionUuid}
            refetchGenerations={refetchGenerations}
          />
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

GenerationsControlCenterFlyoutComponent.displayName = 'GenerationsControlCenterFlyout';

export const GenerationsControlCenterFlyout = React.memo(GenerationsControlCenterFlyoutComponent);
