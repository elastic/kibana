/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSwitchEvent } from '@elastic/eui';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiFlexGroup,
  EuiPanel,
} from '@elastic/eui';
import { useFetchAnonymizationFields } from '@kbn/elastic-assistant';
import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { AddConnectorModal } from '@kbn/elastic-assistant/impl/connectorland/add_connector_modal';
import { useLoadActionTypes } from '@kbn/elastic-assistant/impl/connectorland/use_load_action_types';
import type { ActionConnector, ActionType } from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from '../../../../common/lib/kibana';
import { useAssistantAvailability } from '../../../../assistant/use_assistant_availability';
import { useAgentBuilderAvailability } from '../../../../agent_builder/hooks/use_agent_builder_availability';
import type { EntityType } from '../../../../../common/search_strategy';
import { useStoredAssistantConnectorId } from '../../../../onboarding/components/hooks/use_stored_state';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { useHasEntityHighlightsLicense } from '../../../../common/hooks/use_has_entity_highlights_license';
import { useFetchEntityDetailsHighlights } from '../hooks/use_fetch_entity_details_highlights';
import { EntityHighlightsSettings } from './entity_highlights_settings';
import { EntityHighlightsResult } from './entity_highlights_result';
import { useLoadInferenceConnectors } from '../hooks/use_inference_connectors';

export const EntityHighlightsAccordion: React.FC<{
  entityIdentifier: string;
  entityType: EntityType;
}> = ({ entityType, entityIdentifier }) => {
  const { data: anonymizationFields, isLoading: isAnonymizationFieldsLoading } =
    useFetchAnonymizationFields();
  const {
    triggersActionsUi: { actionTypeRegistry },
    http,
  } = useKibana().services;
  const { data: actionTypes } = useLoadActionTypes({ http });
  const {
    isLoading: isLoadingConnectors,
    data: aiConnectors,
    refetch: refetchAiConnectors,
  } = useLoadInferenceConnectors();
  const spaceId = useSpaceId();
  const [storedConnectorId, setStoredConnectorId] = useStoredAssistantConnectorId(spaceId ?? '');
  const connectorId = useMemo(() => {
    if (!aiConnectors || !aiConnectors.connectors) return '';
    // try to find the stored connector id in the list of available connectors
    const storedConnector = aiConnectors.connectors.find(
      (c) => c.connectorId === storedConnectorId
    );
    const firstConnector = aiConnectors.connectors[0];
    const cId = storedConnector?.connectorId ?? firstConnector?.connectorId ?? '';
    return cId;
  }, [aiConnectors, storedConnectorId]);

  const connectorName = useMemo(() => {
    if (!aiConnectors || !aiConnectors.connectors) return '';
    const cName = aiConnectors.connectors.find((c) => c.connectorId === connectorId)?.name ?? '';
    return cName;
  }, [aiConnectors, connectorId]);

  const [isConnectorModalVisible, setIsConnectorModalVisible] = useState<boolean>(false);
  const { hasConnectorsReadPrivilege, hasAssistantPrivilege, isAssistantVisible } =
    useAssistantAvailability();
  const { hasAgentBuilderPrivilege } = useAgentBuilderAvailability();
  const hasEntityHighlightsLicense = useHasEntityHighlightsLicense();
  const [selectedActionType, setSelectedActionType] = useState<ActionType | null>(null);

  const [showAnonymizedValues, setShowAnonymizedValues] = useState(false);
  const onChangeShowAnonymizedValues = useCallback(
    (e: EuiSwitchEvent) => {
      setShowAnonymizedValues(e.target.checked);
    },
    [setShowAnonymizedValues]
  );

  const {
    fetchEntityHighlights,
    isChatLoading,
    result: assistantResult,
    error,
  } = useFetchEntityDetailsHighlights({
    connectorId,
    anonymizationFields: anonymizationFields?.data ?? [],
    entityType,
    entityIdentifier,
  });

  const onAddConnectorClick = useCallback(() => {
    setIsConnectorModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsConnectorModalVisible(false);
  }, []);

  const onSaveConnector = useCallback(
    (connector: ActionConnector) => {
      setStoredConnectorId(connector.id);
      refetchAiConnectors();
      closeModal();
    },
    [closeModal, setStoredConnectorId, refetchAiConnectors]
  );

  const [isPopoverOpen, setPopover] = useState(false);
  const onButtonClick = useCallback(() => {
    setPopover(!isPopoverOpen);
  }, [isPopoverOpen]);

  const closePopover = useCallback(() => {
    setPopover(false);
  }, []);

  const disabled = useMemo(() => {
    if (!hasEntityHighlightsLicense) {
      return true;
    }

    // if user does not have access to connectors, we cannot invoke the inference action
    if (!hasConnectorsReadPrivilege) {
      return true;
    }

    // if user does not have access to assistant or agent builder, disable entity highlights
    return !(hasAssistantPrivilege || hasAgentBuilderPrivilege);
  }, [
    hasConnectorsReadPrivilege,
    hasAgentBuilderPrivilege,
    hasAssistantPrivilege,
    hasEntityHighlightsLicense,
  ]);

  const isLoading = useMemo(
    () => isChatLoading || isAnonymizationFieldsLoading || isLoadingConnectors,
    [isAnonymizationFieldsLoading, isChatLoading, isLoadingConnectors]
  );

  const [dismissedError, setDismissedError] = useState<Error | null>(null);
  const showErrorBanner = useMemo(
    () => error != null && error !== dismissedError,
    [dismissedError, error]
  );

  if (disabled) {
    return null;
  }

  return (
    <>
      <EuiAccordion
        initialIsOpen
        id="entity-highlights"
        buttonContent={
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.securitySolution.flyout.entityDetails.highlights.title"
                defaultMessage="Entity summary"
              />{' '}
              <EuiIcon type="sparkles" aria-hidden={true} />
            </h3>
          </EuiTitle>
        }
        data-test-subj="asset-criticality-selector"
        extraAction={
          aiConnectors?.hasConnectors && (
            <EntityHighlightsSettings
              assistantResult={assistantResult}
              showAnonymizedValues={showAnonymizedValues}
              onChangeShowAnonymizedValues={onChangeShowAnonymizedValues}
              setConnectorId={setStoredConnectorId}
              connectorId={connectorId}
              connectorName={connectorName}
              closePopover={closePopover}
              openPopover={onButtonClick}
              isLoading={isLoading}
              isPopoverOpen={isPopoverOpen}
              isAssistantVisible={isAssistantVisible}
              entityType={entityType}
              entityIdentifier={entityIdentifier}
            />
          )
        }
      >
        <EuiSpacer size="m" />
        {showErrorBanner && (
          <>
            <EuiCallOut
              color="danger"
              data-test-subj="entity-highlights-error-banner"
              announceOnMount
              size="s"
              heading="p"
              title={
                <FormattedMessage
                  id="xpack.securitySolution.flyout.entityDetails.highlights.errorBannerTitle"
                  defaultMessage="Error generating summary"
                />
              }
              onDismiss={() => setDismissedError(error)}
            >
              <EuiText size="xs">
                <p>
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.entityDetails.highlights.errorBannerBody"
                    defaultMessage="Due to an unexpected issue, LLM could not generate the summary. Please try again."
                  />
                </p>
              </EuiText>
              <EuiSpacer size="s" />
              <EuiButtonEmpty
                size="s"
                iconType="refresh"
                onClick={fetchEntityHighlights}
                isDisabled={!connectorId || isLoading}
                data-test-subj="entity-highlights-error-regenerate"
              >
                <FormattedMessage
                  id="xpack.securitySolution.flyout.entityDetails.highlights.errorBannerRegenerate"
                  defaultMessage="Regenerate"
                />
              </EuiButtonEmpty>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}
        {assistantResult && !isLoading && (
          <EntityHighlightsResult
            assistantResult={assistantResult}
            showAnonymizedValues={showAnonymizedValues}
            generatedAt={assistantResult?.generatedAt ?? null}
            onRefresh={fetchEntityHighlights}
          />
        )}

        {isChatLoading && (
          <EuiPanel hasBorder={true}>
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.securitySolution.flyout.entityDetails.highlights.loadingMessage"
                defaultMessage="Generating AI summary and recommended actions..."
              />
              <EuiSpacer size="xs" />
            </EuiText>
            <EuiSkeletonText lines={2} size="xs" />
          </EuiPanel>
        )}

        {!assistantResult && !isLoading && !showErrorBanner && (
          <EuiPanel hasBorder={true}>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem grow={4}>
                <EuiText size="xs" textAlign="left">
                  {!connectorId ? (
                    <FormattedMessage
                      id="xpack.securitySolution.flyout.entityDetails.highlights.cardDescription.noConnector"
                      defaultMessage="No AI connector is configured. Please configure an AI connector to generate a summary."
                    />
                  ) : (
                    <FormattedMessage
                      id="xpack.securitySolution.flyout.entityDetails.highlights.cardDescription.default"
                      defaultMessage="Create AI summary of the entity to better understand its key characteristics and see recommended actions."
                    />
                  )}
                </EuiText>
              </EuiFlexItem>
              {aiConnectors?.hasConnectors ? (
                <EuiFlexItem grow={1}>
                  <EuiButton
                    onClick={fetchEntityHighlights}
                    isDisabled={!connectorId}
                    color="primary"
                    size="s"
                  >
                    <FormattedMessage
                      id="xpack.securitySolution.flyout.entityDetails.highlights.generateButton"
                      defaultMessage="Generate"
                    />
                  </EuiButton>
                </EuiFlexItem>
              ) : (
                <EuiFlexItem grow={1}>
                  <EuiButton onClick={onAddConnectorClick} color="primary" size="s">
                    <FormattedMessage
                      id="xpack.securitySolution.flyout.entityDetails.highlights.addConnectorButton"
                      defaultMessage="Add connector"
                    />
                  </EuiButton>
                </EuiFlexItem>
              )}

              {isConnectorModalVisible && (
                <Suspense fallback>
                  <AddConnectorModal
                    actionTypeRegistry={actionTypeRegistry}
                    actionTypes={actionTypes}
                    onClose={closeModal}
                    onSaveConnector={onSaveConnector}
                    onSelectActionType={(actionType: ActionType) =>
                      setSelectedActionType(actionType)
                    }
                    selectedActionType={selectedActionType}
                  />
                </Suspense>
              )}
            </EuiFlexGroup>
          </EuiPanel>
        )}
      </EuiAccordion>
      <EuiHorizontalRule />
    </>
  );
};
