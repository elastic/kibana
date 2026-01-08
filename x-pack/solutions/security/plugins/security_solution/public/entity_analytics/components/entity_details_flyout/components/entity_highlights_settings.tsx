/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSwitchEvent } from '@elastic/eui';
import {
  EuiPanel,
  EuiContextMenuItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiContextMenuPanel,
  EuiPopover,
  EuiButtonIcon,
} from '@elastic/eui';
import React, { useMemo, useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { AssistantIcon } from '@kbn/ai-assistant-icon';
import { noop } from 'lodash';
import { ConnectorSelectorInline } from '@kbn/elastic-assistant';
import { css } from '@emotion/react';
import { isEmpty } from 'lodash/fp';
import { AnonymizationSettingsManagement } from '@kbn/elastic-assistant/impl/data_anonymization/settings/anonymization_settings_management';
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

  const items = useMemo(
    () => [
      <EuiPanel color="transparent" paddingSize="none" key={'entity-highlights-settings-menu'}>
        <EuiContextMenuItem
          aria-label={i18n.translate(
            'xpack.securitySolution.flyout.entityDetails.highlights.anonymizeValuesAriaLabel',
            {
              defaultMessage: 'Show anonymized values',
            }
          )}
          key="anonymize-values"
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

        {isAgentBuilderEnabled ? (
          <EuiContextMenuItem
            aria-label={i18n.translate(
              'xpack.securitySolution.flyout.entityDetails.highlights.askAiAssistantAriaLabel',
              {
                defaultMessage: 'Ask AI Assistant',
              }
            )}
            key={'ask-ai-assistant'}
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
        ) : (
          isAssistantVisible && (
            <EuiContextMenuItem
              aria-label={i18n.translate(
                'xpack.securitySolution.flyout.entityDetails.highlights.askAiAssistantAriaLabel',
                {
                  defaultMessage: 'Ask AI Assistant',
                }
              )}
              key={'ask-ai-assistant'}
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
          )
        )}

        {isAnonymizationModalVisible && (
          <AnonymizationSettingsManagement modalMode onClose={closeAnonymizationModal} />
        )}

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
          />
        </EuiContextMenuItem>
      </EuiPanel>,
    ],
    [
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
      closeAnonymizationModal,
      isAnonymizationModalVisible,
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
      <EuiContextMenuPanel
        items={items}
        css={css`
          width: 280px;
        `}
      />
    </EuiPopover>
  );
};
