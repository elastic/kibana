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
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiFlexGroup,
  EuiPanel,
} from '@elastic/eui';
import { AiButton, AiIcon } from '@kbn/shared-ux-ai-components';
import { useFetchAnonymizationFields, useMaybeAssistantContext } from '@kbn/elastic-assistant';
import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { AddConnectorModal } from '@kbn/elastic-assistant/impl/connectorland/add_connector_modal';
import { useLoadActionTypes } from '@kbn/elastic-assistant/impl/connectorland/use_load_action_types';
import type { ActionConnector, ActionType } from '@kbn/triggers-actions-ui-plugin/public';
import { useLoadConnectors } from '@kbn/inference-connectors';
import type { EntitySummaryStalenessReason } from '@kbn/entity-store/common';
import {
  buildEntitySummaryStaleness,
  computeEntitySummaryStalenessReasons,
} from '@kbn/entity-store/common/entity_summary';
import { useKibana } from '../../../../common/lib/kibana';
import { useAssistantAvailability } from '../../../../assistant/use_assistant_availability';
import { useAgentBuilderAvailability } from '../../../../agent_builder/hooks/use_agent_builder_availability';
import type { EntityType } from '../../../../../common/search_strategy';
import { useStoredAssistantConnectorId } from '../../../../onboarding/components/hooks/use_stored_state';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { useHasEntityHighlightsLicense } from '../../../../common/hooks/use_has_entity_highlights_license';
import { useFetchEntityDetailsHighlights } from '../hooks/use_fetch_entity_details_highlights';
import { useFetchPersistedAiSummary } from '../hooks/use_fetch_persisted_ai_summary';
import { EntityHighlightsSettings } from './entity_highlights_settings';
import { EntityHighlightsResult } from './entity_highlights_result';
import type { Entity } from '../../../../../common/api/entity_analytics';
import { buildEntitySummaryStalenessEntitySnapshot } from '../../../../flyout/entity_details/shared/entity_store_risk_utils';
import type { EntityStoreRecord } from '../../../../flyout/entity_details/shared/hooks/use_entity_from_store';

export const EntityHighlightsAccordion: React.FC<{
  entityIdentifier: string;
  entityType: EntityType;
  entityRecord?: Entity | null;
  refetchEntityRecord?: () => void;
}> = ({ entityType, entityIdentifier, entityRecord, refetchEntityRecord }) => {
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

  // Read the persisted summary from the metadata datastream (may be null if never
  // generated, or if the user lacks metadata read access — see `canRead`). This
  // loads on flyout open and does not regenerate on close / click-away.
  const {
    summary: storedSummary,
    canRead: canReadPersistedSummary,
    refetch: refetchPersistedSummary,
    isLoading: isPersistedSummaryLoading,
    isFetching: isPersistedSummaryFetching,
  } = useFetchPersistedAiSummary({
    entityType,
    entityIdentifier,
  });

  // Snapshot of current entity signals — passed to the hook so they are persisted
  // alongside the summary at generation time for future staleness detection.
  const entitySnapshot = useMemo(
    () =>
      buildEntitySummaryStalenessEntitySnapshot(
        entityRecord ? (entityRecord as EntityStoreRecord) : null
      ),
    [entityRecord]
  );

  const {
    fetchEntityHighlights,
    isGeneratingSummary,
    result: assistantResult,
    error,
    generationBaseline,
  } = useFetchEntityDetailsHighlights({
    connectorId,
    anonymizationFields: anonymizationFields?.data ?? [],
    entityType,
    entityIdentifier,
    storedSummary,
    entitySnapshot,
    refetchEntityRecord,
    refetchPersistedSummary,
    // Persist only when the user can read the metadata index, otherwise keep it in-session only
    persistSummary: canReadPersistedSummary,
  });

  // Staleness check — compare stored snapshot against current entity signals.
  // This is computed client-side using already-loaded entity data (no extra API call).
  // NOTE: Per the RFC, this should move to a dedicated server-side endpoint
  // before GA so all surfaces (Agent Builder, external clients) share the same logic.
  const stalenessReasons = useMemo((): EntitySummaryStalenessReason[] => {
    if (!storedSummary) return [];

    // After in-session generation the entity record is not refetched immediately, so
    // comparing the old persisted snapshot would false-positive. Suppress until live
    // signals drift from the generation-time baseline.
    if (generationBaseline) {
      const driftSinceGeneration = computeEntitySummaryStalenessReasons(
        {
          ...storedSummary,
          staleness: buildEntitySummaryStaleness(generationBaseline),
        },
        entitySnapshot
      );
      if (driftSinceGeneration.length === 0) {
        return [];
      }
    }

    return computeEntitySummaryStalenessReasons(storedSummary, entitySnapshot);
  }, [storedSummary, entitySnapshot, generationBaseline]);

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

  const canGenerate = useMemo(() => {
    // No `AssistantProvider` in the tree, e.g. Agent Builder attachment Canvas. Highlights
    // relies on assistant context (anonymization fields, shared state), so hide the UI entirely.
    if (!assistantContext) {
      return false;
    }

    // if user does not have access to connectors, we cannot invoke the inference action
    if (!hasConnectorsReadPrivilege) {
      return false;
    }

    // the user must have access to assistant or agent builder to be able to generate a summary
    return hasAssistantPrivilege || hasAgentBuilderPrivilege;
  }, [
    assistantContext,
    hasConnectorsReadPrivilege,
    hasAgentBuilderPrivilege,
    hasAssistantPrivilege,
  ]);

  const isLoading = useMemo(
    () =>
      isGeneratingSummary ||
      isPersistedSummaryLoading ||
      // Connector / anonymization loading only matters for generation, not for
      // displaying an already-persisted summary to a read-only user.
      (canGenerate && (isAnonymizationFieldsLoading || isLoadingConnectors)),
    [
      canGenerate,
      isAnonymizationFieldsLoading,
      isGeneratingSummary,
      isLoadingConnectors,
      isPersistedSummaryLoading,
    ]
  );

  const [dismissedError, setDismissedError] = useState<Error | null>(null);
  const showErrorBanner = useMemo(
    () => error != null && error !== dismissedError,
    [dismissedError, error]
  );

  const hasAssistantResult = assistantResult != null;
  // First paint with nothing to show yet — replace the body with a skeleton.
  const isLoadingInitialSummary = !hasAssistantResult && isPersistedSummaryLoading;
  // Content is already on screen; keep it mounted and show a thin progress bar
  // while the persisted summary refetches in the background
  const isSummaryRefreshing =
    hasAssistantResult && isPersistedSummaryFetching && !isGeneratingSummary;

  const hasReadablePersistedSummary =
    canReadPersistedSummary && (storedSummary != null || hasAssistantResult);

  // Shown if the user has access to generate a summary
  // and there is no summary yet, no error, and nothing is loading
  const showSummaryEmptyState =
    canGenerate &&
    !hasAssistantResult &&
    !storedSummary &&
    !isLoadingInitialSummary &&
    !isGeneratingSummary &&
    !showErrorBanner;

  if (!hasEntityHighlightsLicense) {
    return null;
  }

  // hide section if user cannot generate a summary and there is no stored summary
  if (!canGenerate && (isPersistedSummaryLoading || !hasReadablePersistedSummary)) {
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
          canGenerate &&
          (aiConnectors?.length ?? 0) > 0 && (
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
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

        {hasAssistantResult && !isGeneratingSummary && (
          <EntityHighlightsResult
            assistantResult={assistantResult}
            showAnonymizedValues={showAnonymizedValues}
            generatedAt={assistantResult?.generatedAt ?? null}
            generatedBy={assistantResult?.generatedBy ?? ''}
            authorProfileUid={assistantResult?.authorProfileUid}
            stalenessReasons={stalenessReasons}
            onRefresh={fetchEntityHighlights}
            canRegenerate={canGenerate}
            isRefreshing={isSummaryRefreshing}
          />
        )}

        {isGeneratingSummary && (
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

        {isLoadingInitialSummary && (
          <EuiPanel hasBorder={true}>
            <EuiSkeletonText
              lines={2}
              size="xs"
              contentAriaLabel={i18n.translate(
                'xpack.securitySolution.flyout.entityDetails.highlights.loadingPersistedAriaLabel',
                { defaultMessage: 'Entity summary' }
              )}
            />
          </EuiPanel>
        )}

        {showSummaryEmptyState && (
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
