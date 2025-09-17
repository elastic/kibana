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
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiMarkdownFormat,
  EuiPanel,
  EuiPopover,
  EuiSkeletonText,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import {
  ConnectorSelectorInline,
  useChatComplete,
  useFetchAnonymizationFields,
  useLoadConnectors,
} from '@kbn/elastic-assistant';
import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import type { Replacements } from '@kbn/elastic-assistant-common';
import { replaceAnonymizedValuesWithOriginalValues } from '@kbn/elastic-assistant-common';
import { FormattedMessage } from '@kbn/i18n-react';
import { noop } from 'lodash';

import { i18n } from '@kbn/i18n';
import { AssistantIcon } from '@kbn/ai-assistant-icon';
import type { EntityType } from '../../../../../common/search_strategy';
import { useKibana } from '../../../../common/lib/kibana/use_kibana';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useStoredAssistantConnectorId } from '../../../../onboarding/components/hooks/use_stored_state';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useAskAiAssistant } from '../tabs/risk_inputs/use_ask_ai_assistant';
import { useEntityAnalyticsRoutes } from '../../../api/api';

const prompt =
  'Generate markdown text with most important information for entity so a Security analyst can act. Your response should take all the important elements of the entity into consideration. Limit your response to 500 characters. Only reply with the required sections, and nothing else.';

const messageFormatting = `Return a string with markdown text without any explanations, or variable assignments. Do **not** wrap the output in triple backticks. 
  The result must be a list of bullet points, nothing more.
  Generate summaries for the following sections, but omit any section that if the information isn't available in the context:
    - Risk score: Summarize the entity's risk score and the main factors contributing to it.
    - Criticality: Note the entity's criticality level and its impact on the risk score.
    - Vulnerabilities: Summarize any significant Vulnerability and briefly explain why it is significant.
    - Misconfigurations: Summarize any significant Misconfiguration and briefly explain why it is significant.
    - Anomalies: Summarize unusual activities or anomalies detected for the entity and briefly explain why it is significant.  
  The generated data **MUST** follow this pattern:
"""- **{title1}**: {description1}
- **{title2}**: {description2}
...
- **{titleN}**: {descriptionN}

**Recommended action**: {description}"""

  
  **Strict rules**:
    _ Only reply with the required sections, and nothing else.
    - Limit your total response to 500 characters.
    - Never return an section which there is no data available in the context.
    - Use inline code (backticks) for technical values like file paths, process names, arguments, etc.
    - Recommended action title should be bold and text should be inline.    
    - **Do not** include any extra explanation, reasoning or text.
  `;

const getAnonymizedEntityIdentifier = (identifier: string, replacements: Replacements) => {
  const [anonymizedEntityIdentifier] =
    Object.entries(replacements).find(([_, value]) => value === identifier) ?? [];
  return anonymizedEntityIdentifier;
};

export const EntityHighlightsAccordion: React.FC<{
  entityIdentifier: string;
  entityType: EntityType;
}> = ({ entityType, entityIdentifier }) => {
  const xsFontSize = useEuiFontSize('xxs').fontSize;
  const { http } = useKibana().services;

  const { from, to } = useGlobalTime();
  const { data: anonymizationFields, isLoading: isAnonymizationFieldsLoading } =
    useFetchAnonymizationFields();

  const { data: aiConnectors } = useLoadConnectors({
    http,
  });
  const spaceId = useSpaceId();
  const { euiTheme } = useEuiTheme();

  const firstConnector = aiConnectors?.[0];
  const [connectorId, setConnectorId] = useStoredAssistantConnectorId(spaceId ?? '');

  const {
    abortStream,
    sendMessage,
    isLoading: isChatLoading,
  } = useChatComplete({
    connectorId: connectorId ?? firstConnector?.id ?? '',
  });

  const [showAnonymizedValues, setShowAnonymizedValues] = useState(false);
  const onChangeShowAnonymizedValues = useCallback(
    (e: EuiSwitchEvent) => {
      setShowAnonymizedValues(e.target.checked);
    },
    [setShowAnonymizedValues]
  );

  const [assistantResult, setAssistantResult] = React.useState<{
    aiResponse: string;
    replacements: Replacements;
    timestamp: string;
    formattedEntitySummary: string;
  } | null>(null);

  const { addError } = useAppToasts();

  // const {
  //   data: entityDetailsHighlights,
  //   fetchEntityHighlights,
  //   isLoading: isEntityDetailsHighlightsLoading,
  // } = useEntityDetailsHighlights({
  //   entityType,
  //   entityIdentifier,
  //   anonymizationFields: anonymizationFields.data,
  //   from: new Date(from).getTime(),
  //   to: new Date(to).getTime(),
  // });

  const { fetchEntityDetailsHighlights } = useEntityAnalyticsRoutes();

  const fetchEntityHighlightsCallback = useCallback(async () => {
    const { summary, replacements } = await fetchEntityDetailsHighlights({
      entityType,
      entityIdentifier,
      anonymizationFields: anonymizationFields.data,
      from: new Date(from).getTime(),
      to: new Date(to).getTime(),
    });

    // const { summary, replacements } = entityDetailsHighlights;

    const summaryFormatted = JSON.stringify(summary);

    const rawResponse = await sendMessage({
      message: `${prompt}.
      Format: ${messageFormatting}
      Context:
          EntityType: ${entityType},
          EntityIdentifier: ${getAnonymizedEntityIdentifier(entityIdentifier, replacements)},
        ${summaryFormatted}
      `,
      replacements,
      query: {
        content_references_disabled: true,
      },
    });

    if (rawResponse.isError) {
      addError(new Error(rawResponse.response), {
        title: i18n.translate('xpack.securitySolution.??', {
          defaultMessage: `Failed to run LLM`,
        }),
      });

      return;
    }

    setAssistantResult({
      formattedEntitySummary: summaryFormatted,
      aiResponse: rawResponse.response,
      replacements,
      timestamp: new Date().toISOString(),
    });
  }, [
    addError,
    anonymizationFields.data,
    entityIdentifier,
    entityType,
    fetchEntityDetailsHighlights,
    from,
    sendMessage,
    to,
  ]);

  const [isPopoverOpen, setPopover] = useState(false);
  const onButtonClick = useCallback(() => {
    setPopover(!isPopoverOpen);
  }, [isPopoverOpen]);

  const closePopover = useCallback(() => {
    setPopover(false);
  }, []);

  const anonymizedEntityIdentifier = getAnonymizedEntityIdentifier(
    entityIdentifier,
    assistantResult?.replacements ?? {}
  );

  const getPromptContext = useCallback(
    async () =>
      `### The following entity is under investigation:\nType: ${entityType}\nIdentifier: ${`\`${anonymizedEntityIdentifier}\``}\n#### Highlights:\n${
        assistantResult?.aiResponse
      }\n#### Context:\n\`\`\`json\n${assistantResult?.formattedEntitySummary}`,
    [
      anonymizedEntityIdentifier,
      assistantResult?.aiResponse,
      assistantResult?.formattedEntitySummary,
      entityType,
    ]
  );

  const { showAssistantOverlay, disabled: aiAssistantDisable } = useAskAiAssistant({
    title: `Investigating ${entityType} '${entityIdentifier}'`,
    description: `Entity: ${entityIdentifier}`,
    suggestedPrompt: `Investigate the entity and suggest next steps.`,
    getPromptContext,
    replacements: assistantResult?.replacements,
  });

  const isLoading = isChatLoading || isAnonymizationFieldsLoading;

  const items = useMemo(
    () => [
      <EuiPanel color="transparent" paddingSize="none">
        <EuiContextMenuItem
          // aria-label={'Regenerate'}
          key={'regenerate'}
          onClick={fetchEntityHighlightsCallback}
          icon={'refresh'}
          // data-test-subj={'Regenerate'}
          disabled={!assistantResult}
        >
          {'Regenerate'}
        </EuiContextMenuItem>

        <EuiContextMenuItem
          // aria-label={'anonymize-values'}
          key={'anonymize-values'}
          // data-test-subj={'anonymize-values'}
        >
          <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiSwitch
                // data-test-subj={'anonymize-switch'}
                label={'Show anonymized values'} // TODO: Add translation
                checked={showAnonymizedValues}
                onChange={onChangeShowAnonymizedValues}
                compressed
                // disabled={!selectedConversationHasAnonymizedValues}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiContextMenuItem>

        <EuiContextMenuItem
          // aria-label={'Regenerate'}
          key={'regenerate'}
          onClick={() => {
            showAssistantOverlay();
            closePopover();
          }}
          // iconType={AssistantIcon}
          icon={<AssistantIcon />}
          // data-test-subj={'Regenerate'}
          disabled={!assistantResult}
        >
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.??????.askAiAssistant"
            defaultMessage="Ask AI Assistant"
          />
        </EuiContextMenuItem>

        <EuiContextMenuItem
          aria-label={'connector-selector'}
          key={'connector-selector'}
          // data-test-subj={'connector-selector'}
        >
          <ConnectorSelectorInline
            onConnectorSelected={noop}
            onConnectorIdSelected={setConnectorId}
            selectedConnectorId={connectorId}
          />
        </EuiContextMenuItem>
      </EuiPanel>,
    ],
    [
      assistantResult,
      fetchEntityHighlightsCallback,
      closePopover,
      connectorId,
      onChangeShowAnonymizedValues,
      setConnectorId,
      showAnonymizedValues,
      showAssistantOverlay,
    ]
  );
  return (
    <>
      <EuiAccordion
        initialIsOpen
        id="entity-highlights"
        buttonContent={
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.securitySolution.flyout.entityDetails.title"
                defaultMessage="Entity highlights"
              />{' '}
              <EuiIcon type="sparkles" />
            </h3>
          </EuiTitle>
        }
        data-test-subj="asset-criticality-selector"
        extraAction={
          <EuiPopover
            button={
              <EuiButtonIcon
                // aria-label={i18n.CONVO_ASSISTANT_MENU}
                // isDisabled={isDisabled}
                iconType="boxesVertical"
                onClick={onButtonClick}
                disabled={isLoading}
                // data-test-subj="conversation-settings-menu"
              />
            }
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            panelPaddingSize="none"
            anchorPosition="leftUp"
          >
            <EuiContextMenuPanel
              items={items}
              css={css`
                width: 280px;
              `}
            />
          </EuiPopover>
          // {/* <EuiToolTip content={i18n.CONVO_ASSISTANT_MENU}> */}
          //   {/* </EuiToolTip> */}
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
              {'Generating AI highlights and recommended actions...'}
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
            onClick={fetchEntityHighlightsCallback}
            isDisabled={!connectorId}
          >
            {'Generate AI highlights'}
          </EuiButton>
        )}
      </EuiAccordion>
      <EuiHorizontalRule />
    </>
  );
};
