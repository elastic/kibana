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
import React, { useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { noop } from 'lodash';
import { AssistantIcon } from '@kbn/ai-assistant-icon';
import { ConnectorSelectorInline } from '@kbn/elastic-assistant';
import { css } from '@emotion/react';
import { isEmpty } from 'lodash/fp';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { NewAgentBuilderAttachment } from '../../../../agent_builder/components/new_agent_builder_attachment';
import { useAgentBuilderAttachment } from '../../../../agent_builder/hooks/use_agent_builder_attachment';
import { useAskAiAssistant } from '../tabs/risk_inputs/use_ask_ai_assistant';
import { getAnonymizedEntityIdentifier } from '../utils/helpers';
import { SecurityAgentBuilderAttachments } from '../../../../../common/constants';

interface EntityHighlightsSettingsProps {
  onRegenerate: () => void;
  showAnonymizedValues: boolean;
  onChangeShowAnonymizedValues: (event: EuiSwitchEvent) => void;
  setConnectorId: (id: string) => void;
  connectorId: string;
  entityType: string;
  entityIdentifier: string;

  assistantResult: {
    aiResponse?: string;
    replacements?: Record<string, string>;
    formattedEntitySummary?: string;
  } | null;
  closePopover: () => void;
  openPopover: () => void;
  isLoading: boolean;
  isPopoverOpen: boolean;
}

export const EntityHighlightsSettings: React.FC<EntityHighlightsSettingsProps> = ({
  onRegenerate,
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

  assistantResult,
}) => {
  const anonymizedEntityIdentifier = getAnonymizedEntityIdentifier(
    entityIdentifier,
    assistantResult?.replacements ?? {}
  );

  const selectedConversationHasAnonymizedValues = useMemo(
    () => !isEmpty(assistantResult?.replacements),
    [assistantResult?.replacements]
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

  const { showAssistantOverlay } = useAskAiAssistant({
    title: `Investigating ${entityType} '${entityIdentifier}'`,
    description: `Entity: ${entityIdentifier}`,
    suggestedPrompt: `Investigate the entity and suggest next steps.`,
    getPromptContext,
    replacements: assistantResult?.replacements,
  });

  const isAgentBuilderEnabled = useIsExperimentalFeatureEnabled('agentBuilderEnabled');

  const { openAgentBuilderFlyout } = useAgentBuilderAttachment({
    attachmentType: SecurityAgentBuilderAttachments.entity,
    attachmentData: { identifierType: entityType, identifier: entityIdentifier },
    attachmentPrompt: `Investigate the entity and suggest next steps.`,
  });
  const onAgentBuildAttachmentClick = useCallback(() => {
    openAgentBuilderFlyout();
    closePopover();
  }, [closePopover, openAgentBuilderFlyout]);

  const items = useMemo(
    () => [
      <EuiPanel color="transparent" paddingSize="none" key={'entity-highlights-settings-menu'}>
        <EuiContextMenuItem
          aria-label={i18n.translate(
            'xpack.securitySolution.flyout.entityDetails.highlights.regenerateAriaLabel',
            {
              defaultMessage: 'Regenerate',
            }
          )}
          key="regenerate"
          onClick={onRegenerate}
          icon="refresh"
          disabled={isLoading || !assistantResult}
        >
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.highlights.regenerate"
            defaultMessage="Regenerate"
          />
        </EuiContextMenuItem>

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
            disabled={isLoading}
          >
            <NewAgentBuilderAttachment onClick={onAgentBuildAttachmentClick} size="s" />
          </EuiContextMenuItem>
        ) : (
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
            disabled={isLoading}
          >
            <FormattedMessage
              id="xpack.securitySolution.flyout.entityDetails.highlights.askAiAssistant"
              defaultMessage="Ask AI Assistant"
            />
          </EuiContextMenuItem>
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
      onRegenerate,
      isLoading,
      assistantResult,
      showAnonymizedValues,
      onChangeShowAnonymizedValues,
      selectedConversationHasAnonymizedValues,
      isAgentBuilderEnabled,
      onAgentBuildAttachmentClick,
      setConnectorId,
      connectorId,
      showAssistantOverlay,
      closePopover,
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
