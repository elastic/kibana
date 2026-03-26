/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSwitchEvent } from '@elastic/eui';
import {
  EuiContextMenuItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiContextMenu,
  EuiPopover,
  EuiButtonIcon,
  EuiText,
  EuiPopoverTitle,
  EuiTextTruncate,
} from '@elastic/eui';
import React, { useMemo, useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { AssistantIcon } from '@kbn/ai-assistant-icon';
import { noop } from 'lodash';
import { ConnectorSelectorInline } from '@kbn/elastic-assistant';
import { isEmpty } from 'lodash/fp';
import { AnonymizationSettingsManagement } from '@kbn/elastic-assistant/impl/data_anonymization/settings/anonymization_settings_management';
import { css } from '@emotion/react';
import { useAgentBuilderAvailability } from '../../../../agent_builder/hooks/use_agent_builder_availability';
import { ENTITY_PROMPT } from '../../../../agent_builder/components/prompts';
import { NewAgentBuilderAttachment } from '../../../../agent_builder/components/new_agent_builder_attachment';
import { useAgentBuilderAttachment } from '../../../../agent_builder/hooks/use_agent_builder_attachment';
import { useAskAiAssistant } from '../tabs/risk_inputs/use_ask_ai_assistant';
import { getAnonymizedEntityIdentifier } from '../utils/helpers';
import { SecurityAgentBuilderAttachments } from '../../../../../common/constants';

interface EntityHighlightsSettingsProps {
  showAnonymizedValues: boolean;
  onChangeShowAnonymizedValues: (event: EuiSwitchEvent) => void;
  setConnectorId: (id: string) => void;
  connectorId: string;
  connectorName: string;
  entityType: string;
  entityIdentifier: string;
  assistantResult: {
    replacements?: Record<string, string>;
    summaryAsText?: string;
    generatedAt?: number;
  } | null;
  closePopover: () => void;
  openPopover: () => void;
  isAssistantVisible: boolean;
  isLoading: boolean;
  isPopoverOpen: boolean;
}

export const EntityHighlightsSettings: React.FC<EntityHighlightsSettingsProps> = ({
  showAnonymizedValues,
  onChangeShowAnonymizedValues,
  setConnectorId,
  connectorId,
  connectorName,
  closePopover,
  openPopover,
  isLoading,
  isPopoverOpen,
  entityType,
  entityIdentifier,
  isAssistantVisible,
  assistantResult,
}) => {
  const selectedConversationHasAnonymizedValues = useMemo(
    () => !isEmpty(assistantResult?.replacements),
    [assistantResult?.replacements]
  );

  const anonymizedEntityIdentifier = useMemo(
    () =>
      assistantResult?.replacements
        ? getAnonymizedEntityIdentifier(entityIdentifier, assistantResult.replacements)
        : entityIdentifier,
    [entityIdentifier, assistantResult?.replacements]
  );

  const [isAnonymizationModalVisible, setIsAnonymizationModalVisible] = useState(false);
  const closeAnonymizationModal = useCallback(() => setIsAnonymizationModalVisible(false), []);
  const showAnonymizationModal = useCallback(() => setIsAnonymizationModalVisible(true), []);

  const getPromptContext = useCallback(
    async () =>
      `### The following entity is under investigation:\nType: ${entityType}\nIdentifier: ${`\`${anonymizedEntityIdentifier}\``}\n#### Context:\n\`\`\`json\n${
        assistantResult?.summaryAsText
      }`,
    [anonymizedEntityIdentifier, assistantResult?.summaryAsText, entityType]
  );

  const { showAssistantOverlay } = useAskAiAssistant({
    title: `Investigating ${entityType} '${entityIdentifier}'`,
    description: `Entity: ${entityIdentifier}`,
    suggestedPrompt: `Investigate the entity and suggest next steps.`,
    getPromptContext,
    replacements: assistantResult?.replacements,
  });

  const { isAgentBuilderEnabled } = useAgentBuilderAvailability();

  const entityAttachment = useMemo(
    () => ({
      attachmentType: SecurityAgentBuilderAttachments.entity,
      attachmentData: {
        identifierType: entityType,
        identifier: entityIdentifier,
        attachmentLabel: `${entityType}: ${entityIdentifier}`,
      },
      attachmentPrompt: ENTITY_PROMPT,
    }),
    [entityIdentifier, entityType]
  );
  const { openAgentBuilderFlyout } = useAgentBuilderAttachment(entityAttachment);
  const onAgentBuildAttachmentClick = useCallback(() => {
    openAgentBuilderFlyout();
    closePopover();
  }, [closePopover, openAgentBuilderFlyout]);

  const panels = useMemo(
    () => [
      {
        id: 0,
        items: [
          {
            name: (
              <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.entityDetails.highlights.connectorMenuTitle"
                    defaultMessage="Connector"
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s">
                    <strong>
                      <EuiTextTruncate text={connectorName} />
                    </strong>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            ),
            icon: 'plugs',
            panel: 2,
            key: 'entity-highlights-settings-connector',
            'data-test-subj': 'entity-highlights-settings-connector',
          },
          {
            key: 'entity-highlights-settings-options-title',
            renderItem: () => (
              <EuiPopoverTitle
                paddingSize="s"
                aria-label={i18n.translate(
                  'xpack.securitySolution.flyout.entityDetails.highlights.optionsMenuTitle.ariaLabel',
                  {
                    defaultMessage: 'Options',
                  }
                )}
              >
                <EuiText size="xs">
                  <strong>
                    <FormattedMessage
                      id="xpack.securitySolution.flyout.entityDetails.highlights.optionsMenuTitle"
                      defaultMessage="Options"
                    />
                  </strong>
                </EuiText>
              </EuiPopoverTitle>
            ),
          },
          {
            key: 'anonymize-values',
            renderItem: () => (
              <EuiContextMenuItem
                aria-label={i18n.translate(
                  'xpack.securitySolution.flyout.entityDetails.highlights.anonymizeValuesAriaLabel',
                  {
                    defaultMessage: 'Show anonymized values',
                  }
                )}
              >
                <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup
                      alignItems="center"
                      data-test-subj="anonymizationGroup"
                      gutterSize="s"
                      responsive={false}
                      wrap={false}
                    >
                      <EuiFlexItem grow={false}>
                        <EuiSwitch
                          label={i18n.translate(
                            'xpack.securitySolution.flyout.entityDetails.highlights.showAnonymizedValues',
                            {
                              defaultMessage: 'Show anonymized values',
                            }
                          )}
                          checked={showAnonymizedValues}
                          onChange={onChangeShowAnonymizedValues}
                          compressed
                          disabled={!selectedConversationHasAnonymizedValues}
                        />
                      </EuiFlexItem>

                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          aria-label={i18n.translate(
                            'xpack.securitySolution.flyout.entityDetails.highlights.anonymizationArialLabel',
                            {
                              defaultMessage: 'Anonymization',
                            }
                          )}
                          data-test-subj="anonymizationSettings"
                          iconType="gear"
                          onClick={showAnonymizationModal}
                          size="s"
                          color="text"
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiContextMenuItem>
            ),
          },
          {
            key: 'ask-ai-assistant',
            renderItem: () => {
              if (isAgentBuilderEnabled) {
                return (
                  <EuiContextMenuItem
                    aria-label={i18n.translate(
                      'xpack.securitySolution.flyout.entityDetails.highlights.askAiAssistantAriaLabel',
                      {
                        defaultMessage: 'Ask AI Assistant',
                      }
                    )}
                  >
                    <NewAgentBuilderAttachment
                      onClick={onAgentBuildAttachmentClick}
                      size="s"
                      disabled={isLoading || !assistantResult}
                      telemetry={{
                        pathway: 'entity_highlights',
                        attachments: ['entity'],
                      }}
                    />
                  </EuiContextMenuItem>
                );
              }

              if (!isAssistantVisible) return null;

              return (
                <EuiContextMenuItem
                  aria-label={i18n.translate(
                    'xpack.securitySolution.flyout.entityDetails.highlights.askAiAssistantAriaLabel',
                    {
                      defaultMessage: 'Ask AI Assistant',
                    }
                  )}
                  onClick={() => {
                    showAssistantOverlay();
                    closePopover();
                  }}
                  icon={<AssistantIcon />}
                  disabled={isLoading || !assistantResult}
                >
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.entityDetails.highlights.askAiAssistant"
                    defaultMessage="Ask AI Assistant"
                  />
                </EuiContextMenuItem>
              );
            },
          },
        ],
      },
      {
        id: 2,
        title: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.highlights.connectorMenuTitle"
            defaultMessage="Connector"
          />
        ),
        items: [
          {
            key: 'entity-highlights-settings-connector-selector',
            renderItem: () => (
              <EuiContextMenuItem
                aria-label={i18n.translate(
                  'xpack.securitySolution.flyout.entityDetails.highlights.connectorSelectorAriaLabel',
                  {
                    defaultMessage: 'Connector selector',
                  }
                )}
              >
                <ConnectorSelectorInline
                  onConnectorSelected={noop}
                  onConnectorIdSelected={setConnectorId}
                  selectedConnectorId={connectorId}
                  explicitConnectorSelection={true}
                />
              </EuiContextMenuItem>
            ),
          },
        ],
      },
    ],
    [
      connectorName,
      showAnonymizedValues,
      onChangeShowAnonymizedValues,
      selectedConversationHasAnonymizedValues,
      onAgentBuildAttachmentClick,
      isAssistantVisible,
      setConnectorId,
      connectorId,
      showAssistantOverlay,
      closePopover,
      isAgentBuilderEnabled,
      isLoading,
      assistantResult,
      showAnonymizationModal,
    ]
  );

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          aria-label={i18n.translate(
            'xpack.securitySolution.flyout.entityDetails.highlights.openMenuAriaLabel',
            {
              defaultMessage: 'Entity highlights settings menu',
            }
          )}
          iconType="boxesVertical"
          onClick={openPopover}
          disabled={isLoading}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="leftUp"
    >
      <EuiContextMenu
        css={css`
          width: 280px;
        `}
        initialPanelId={0}
        size="m"
        panels={panels}
      />
      {isAnonymizationModalVisible && (
        <AnonymizationSettingsManagement modalMode onClose={closeAnonymizationModal} />
      )}
    </EuiPopover>
  );
};
