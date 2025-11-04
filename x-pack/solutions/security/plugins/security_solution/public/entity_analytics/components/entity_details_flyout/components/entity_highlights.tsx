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
  EuiHorizontalRule,
  EuiIcon,
  EuiMarkdownFormat,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import {
  useAssistantContext,
  useFetchAnonymizationFields,
  useLoadConnectors,
} from '@kbn/elastic-assistant';
import React, { useCallback, useState } from 'react';
import { css } from '@emotion/react';
import { replaceAnonymizedValuesWithOriginalValues } from '@kbn/elastic-assistant-common';
import { FormattedMessage } from '@kbn/i18n-react';
import { useAssistantAvailability } from '../../../../assistant/use_assistant_availability';
import type { EntityType } from '../../../../../common/search_strategy';
import { useStoredAssistantConnectorId } from '../../../../onboarding/components/hooks/use_stored_state';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { useFetchEntityDetailsHighlights } from '../hooks/use_fetch_entity_details_highlights';
import { EntityHighlightsSettings } from './entity_highlights_settings';

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
  const spaceId = useSpaceId();
  const { euiTheme } = useEuiTheme();
  const firstConnector = aiConnectors?.[0];
  const [selectedConnectorId, setConnectorId] = useStoredAssistantConnectorId(spaceId ?? '');
  const { hasAssistantPrivilege, isAssistantEnabled, isAssistantVisible } =
    useAssistantAvailability();

  const [showAnonymizedValues, setShowAnonymizedValues] = useState(false);
  const onChangeShowAnonymizedValues = useCallback(
    (e: EuiSwitchEvent) => {
      setShowAnonymizedValues(e.target.checked);
    },
    [setShowAnonymizedValues]
  );

  const connectorId = selectedConnectorId ?? firstConnector?.id ?? '';

  const {
    fetchEntityHighlights,
    isChatLoading,
    result: assistantResult,
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

  const disabled = !hasAssistantPrivilege || !isAssistantVisible || !isAssistantEnabled;
  const isLoading = isChatLoading || isAnonymizationFieldsLoading;

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
                defaultMessage="Entity highlights"
              />{' '}
              <EuiIcon type="sparkles" />
            </h3>
          </EuiTitle>
        }
        data-test-subj="asset-criticality-selector"
        extraAction={
          <EntityHighlightsSettings
            onRegenerate={fetchEntityHighlights}
            assistantResult={assistantResult}
            showAnonymizedValues={showAnonymizedValues}
            onChangeShowAnonymizedValues={onChangeShowAnonymizedValues}
            setConnectorId={setConnectorId}
            connectorId={connectorId}
            closePopover={closePopover}
            openPopover={onButtonClick}
            isLoading={isLoading}
            isPopoverOpen={isPopoverOpen}
            entityType={entityType}
            entityIdentifier={entityIdentifier}
          />
        }
      >
        <EuiSpacer size="m" />
        {assistantResult && !isLoading && (
          <div>
            <EuiText size="s">
              <EuiMarkdownFormat
                textSize="s"
                css={css`
                  li {
                    margin-bottom: ${euiTheme.size.xs};
                  }
                `}
              >
                {showAnonymizedValues
                  ? assistantResult?.aiResponse
                  : replaceAnonymizedValuesWithOriginalValues({
                      messageContent: assistantResult?.aiResponse,
                      replacements: assistantResult.replacements,
                    })}
              </EuiMarkdownFormat>
            </EuiText>
          </div>
        )}

        {isChatLoading && (
          <div>
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.securitySolution.flyout.entityDetails.highlights.loadingMessage"
                defaultMessage="Generating AI highlights and recommended actions..."
              />
              <EuiSpacer size="xs" />
            </EuiText>
            <EuiSkeletonText lines={4} />
          </div>
        )}

        {!assistantResult && !isLoading && (
          <EuiButton
            iconType="sparkles"
            size="s"
            iconSide="left"
            onClick={fetchEntityHighlights}
            isDisabled={!connectorId}
          >
            <FormattedMessage
              id="xpack.securitySolution.flyout.entityDetails.highlights.generateButton"
              defaultMessage="Generate AI highlights"
            />
          </EuiButton>
        )}
      </EuiAccordion>
      <EuiHorizontalRule />
    </>
  );
};
