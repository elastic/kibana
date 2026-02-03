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
} from '@elastic/eui';
import {
  useAssistantContext,
  useFetchAnonymizationFields,
  useLoadConnectors,
} from '@kbn/elastic-assistant';
import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useAssistantAvailability } from '../../../../assistant/use_assistant_availability';
import type { EntityType } from '../../../../../common/search_strategy';
import { useStoredAssistantConnectorId } from '../../../../onboarding/components/hooks/use_stored_state';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { useHasEntityHighlightsLicense } from '../../../../common/hooks/use_has_entity_highlights_license';
import { useFetchEntityDetailsHighlights } from '../hooks/use_fetch_entity_details_highlights';
import { EntityHighlightsSettings } from './entity_highlights_settings';
import { EntityHighlightsResult } from './entity_highlights_result';
import { useGradientStyles } from './entity_highlights_gradients';

export const EntityHighlightsAccordion: React.FC<{
  entityIdentifier: string;
  entityType: EntityType;
}> = ({ entityType, entityIdentifier }) => {
  const { data: anonymizationFields, isLoading: isAnonymizationFieldsLoading } =
    useFetchAnonymizationFields();
  const { http, settings } = useAssistantContext();
  const { data: aiConnectors } = useLoadConnectors({
    http,
    settings,
  });
  const firstConnector = aiConnectors?.[0];
  const spaceId = useSpaceId();
  const [selectedConnectorId, setConnectorId] = useStoredAssistantConnectorId(spaceId ?? '');
  const connectorId = selectedConnectorId ?? firstConnector?.id ?? '';
  const connectorName = useMemo(() => {
    if (!aiConnectors || !connectorId) return '';
    return aiConnectors.find((c) => c.id === connectorId)?.name ?? '';
  }, [aiConnectors, connectorId]);
  const { hasAssistantPrivilege, isAssistantEnabled, isAssistantVisible } =
    useAssistantAvailability();
  const hasEntityHighlightsLicense = useHasEntityHighlightsLicense();
  const {
    gradientPanelStyle,
    buttonGradientStyle,
    iconGradientStyle,
    gradientSVG,
    buttonTextGradientStyle,
  } = useGradientStyles();

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

  const [isPopoverOpen, setPopover] = useState(false);
  const onButtonClick = useCallback(() => {
    setPopover(!isPopoverOpen);
  }, [isPopoverOpen]);

  const closePopover = useCallback(() => {
    setPopover(false);
  }, []);

  const disabled = useMemo(
    () => !hasAssistantPrivilege || !isAssistantEnabled || !hasEntityHighlightsLicense,
    [hasAssistantPrivilege, isAssistantEnabled, hasEntityHighlightsLicense]
  );

  const isLoading = useMemo(
    () => isChatLoading || isAnonymizationFieldsLoading,
    [isAnonymizationFieldsLoading, isChatLoading]
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
      {gradientSVG}
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
              <EuiIcon type="sparkles" css={iconGradientStyle} />
            </h3>
          </EuiTitle>
        }
        data-test-subj="asset-criticality-selector"
        extraAction={
          <EntityHighlightsSettings
            assistantResult={assistantResult}
            showAnonymizedValues={showAnonymizedValues}
            onChangeShowAnonymizedValues={onChangeShowAnonymizedValues}
            setConnectorId={setConnectorId}
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
          <div css={gradientPanelStyle}>
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.securitySolution.flyout.entityDetails.highlights.loadingMessage"
                defaultMessage="Generating AI summary and recommended actions..."
              />
              <EuiSpacer size="xs" />
            </EuiText>
            <EuiSkeletonText lines={2} size="xs" />
          </div>
        )}

        {!assistantResult && !isLoading && !showErrorBanner && (
          <div css={gradientPanelStyle}>
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
              {connectorId && (
                <EuiFlexItem grow={1}>
                  <EuiButton
                    onClick={fetchEntityHighlights}
                    isDisabled={!connectorId}
                    css={buttonGradientStyle}
                    size="s"
                  >
                    <div css={buttonTextGradientStyle}>
                      <FormattedMessage
                        id="xpack.securitySolution.flyout.entityDetails.highlights.generateButton"
                        defaultMessage="Generate"
                      />
                    </div>
                  </EuiButton>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </div>
        )}
      </EuiAccordion>
      <EuiHorizontalRule />
    </>
  );
};
