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
  EuiButtonGroup,
  EuiCallOut,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiFlexGroup,
  EuiPanel,
  EuiToolTip,
} from '@elastic/eui';
import { AiButton, AiIcon } from '@kbn/shared-ux-ai-components';
import { useFetchAnonymizationFields, useMaybeAssistantContext } from '@kbn/elastic-assistant';
import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { AddConnectorModal } from '@kbn/elastic-assistant/impl/connectorland/add_connector_modal';
import { useLoadActionTypes } from '@kbn/elastic-assistant/impl/connectorland/use_load_action_types';
import type { ActionConnector, ActionType } from '@kbn/triggers-actions-ui-plugin/public';
import { useLoadConnectors } from '@kbn/inference-connectors';
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
import type { StalenessDisplayMode } from './entity_highlights_result';
import type { Entity } from '../../../../../common/api/entity_analytics';
import type { EntitySummaryAttribute } from '@kbn/entity-store/common';

export const EntityHighlightsAccordion: React.FC<{
  entityIdentifier: string;
  entityType: EntityType;
  entityRecord?: Entity | null;
}> = ({ entityType, entityIdentifier, entityRecord }) => {
  // Degrade gracefully on surfaces that render outside `AssistantProvider` (e.g. the Agent
  // Builder attachment Canvas). The Elastic Assistant–backed summary cannot work without it.
  const assistantContext = useMaybeAssistantContext();
  const { data: anonymizationFields, isLoading: isAnonymizationFieldsLoading } =
    useFetchAnonymizationFields();
  const {
    triggersActionsUi: { actionTypeRegistry },
    http,
    settings,
  } = useKibana().services;
  const { data: actionTypes } = useLoadActionTypes({ http });
  const {
    isLoading: isLoadingConnectors,
    data: aiConnectors,
    refetch: refetchAiConnectors,
  } = useLoadConnectors({
    http,
    featureId: 'entity_ai_highlight_summary',
    settings,
  });
  const spaceId = useSpaceId();
  const [storedConnectorId, setStoredConnectorId] = useStoredAssistantConnectorId(spaceId ?? '');
  const connectorId = useMemo(() => {
    if (!aiConnectors || !aiConnectors.length) return '';
    // try to find the stored connector id in the list of available connectors
    const storedConnector = aiConnectors.find((c) => c.id === storedConnectorId);
    const firstConnector = aiConnectors[0];
    const cId = storedConnector?.id ?? firstConnector?.id ?? '';
    return cId;
  }, [aiConnectors, storedConnectorId]);

  const connectorName = useMemo(() => {
    if (!aiConnectors || !aiConnectors.length) return '';
    const cName = aiConnectors.find((c) => c.id === connectorId)?.name ?? '';
    return cName;
  }, [aiConnectors, connectorId]);

  const [isConnectorModalVisible, setIsConnectorModalVisible] = useState<boolean>(false);
  const { hasConnectorsReadPrivilege, hasAssistantPrivilege } = useAssistantAvailability();
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

  // Demo toggle: switch between warning display modes. Remove before GA.
  const [stalenessDisplayMode, setStalenessDisplayMode] = useState<StalenessDisplayMode>('banner');
  const stalenessToggleButtons = useMemo(
    () => [
      { id: 'banner', label: 'Banner' },
      { id: 'inline', label: 'Inline' },
    ],
    []
  );

  // Read the persisted summary from the entity store record (may be null if never generated)
  const storedSummary = useMemo((): EntitySummaryAttribute | null => {
    const summary = entityRecord?.entity?.attributes?.summary;
    return summary ?? null;
  }, [entityRecord]);

  // Snapshot of current entity signals — passed to the hook so they are persisted
  // alongside the summary at generation time for future staleness detection.
  const entitySnapshot = useMemo(() => ({
    riskLevel: entityRecord?.entity?.risk?.calculated_level ?? null,
    anomalyJobIds: entityRecord?.entity?.behaviors?.anomaly_job_ids ?? [],
    ruleNames: entityRecord?.entity?.behaviors?.rule_names ?? [],
  }), [entityRecord]);

  // Staleness check — compare stored snapshot against current entity signals.
  // This is computed client-side using already-loaded entity data (no extra API call).
  // NOTE: Per the RFC, this should move to a dedicated server-side endpoint
  // before GA so all surfaces (Agent Builder, external clients) share the same logic.
  const stalenessReasons = useMemo((): string[] => {
    if (!storedSummary) return [];
    const reasons: string[] = [];

    if (
      storedSummary.risk_level_at_generation &&
      entitySnapshot.riskLevel &&
      entitySnapshot.riskLevel !== storedSummary.risk_level_at_generation
    ) {
      reasons.push(
        `Risk level changed from ${storedSummary.risk_level_at_generation} to ${entitySnapshot.riskLevel}`
      );
    }

    const newAnomalyJobs = (entitySnapshot.anomalyJobIds ?? []).filter(
      (id) => !(storedSummary.anomaly_job_ids_at_generation ?? []).includes(id)
    );
    if (newAnomalyJobs.length > 0) {
      reasons.push(`${newAnomalyJobs.length} new ML anomaly job(s) have fired`);
    }

    const newRules = (entitySnapshot.ruleNames ?? []).filter(
      (r) => !(storedSummary.rule_names_at_generation ?? []).includes(r)
    );
    if (newRules.length > 0) {
      reasons.push(`${newRules.length} new detection rule(s) have triggered`);
    }

    return reasons;
  }, [storedSummary, entitySnapshot]);

  const {
    fetchEntityHighlights,
    isChatLoading,
    result: assistantResult,
    error,
    isFreshGeneration,
  } = useFetchEntityDetailsHighlights({
    connectorId,
    anonymizationFields: anonymizationFields?.data ?? [],
    entityType,
    entityIdentifier,
    storedSummary,
    entitySnapshot,
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
    // No `AssistantProvider` in the tree, e.g. Agent Builder attachment Canvas. Highlights
    // relies on assistant context (anonymization fields, shared state), so hide the UI entirely.
    if (!assistantContext) {
      return true;
    }

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
    assistantContext,
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
              <AiIcon iconType="sparkles" aria-hidden={true} />
            </h3>
          </EuiTitle>
        }
        data-test-subj="asset-criticality-selector"
        extraAction={
          (aiConnectors?.length ?? 0) > 0 && (
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              {stalenessReasons.length > 0 && (
                <EuiFlexItem grow={false}>
                  <EuiToolTip content="Demo toggle: switch between staleness warning styles">
                    <EuiButtonGroup
                      legend="Staleness display mode"
                      options={stalenessToggleButtons}
                      idSelected={stalenessDisplayMode}
                      onChange={(id) => setStalenessDisplayMode(id as StalenessDisplayMode)}
                      buttonSize="compressed"
                      color="warning"
                      data-test-subj="entity-highlights-staleness-mode-toggle"
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
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
                />
              </EuiFlexItem>
            </EuiFlexGroup>
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
            generatedBy={assistantResult?.generatedBy ?? ''}
            stalenessReasons={isFreshGeneration ? [] : stalenessReasons}
            stalenessDisplayMode={stalenessDisplayMode}
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
              {(aiConnectors?.length ?? 0) > 0 ? (
                <EuiFlexItem grow={1}>
                  <AiButton
                    onClick={fetchEntityHighlights}
                    isDisabled={!connectorId}
                    size="s"
                    iconType="sparkles"
                  >
                    <FormattedMessage
                      id="xpack.securitySolution.flyout.entityDetails.highlights.generateButton"
                      defaultMessage="Generate"
                    />
                  </AiButton>
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
