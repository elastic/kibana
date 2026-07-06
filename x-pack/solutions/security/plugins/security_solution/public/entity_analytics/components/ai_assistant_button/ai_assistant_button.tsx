/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { AssistantIcon } from '@kbn/ai-assistant-icon';
import { getAnonymizedValues } from '@kbn/elastic-assistant-common/impl/data_anonymization/get_anonymized_values';
import { getAnonymizedValue } from '@kbn/elastic-assistant-common';
import { useFetchAnonymizationFields } from '@kbn/elastic-assistant';
import type { AnonymizedValues } from '@kbn/elastic-assistant-common/impl/data_anonymization/types';
import { ENTITY_PROMPT } from '../../../agent_builder/components/prompts';
import { useAgentBuilderAvailability } from '../../../agent_builder/hooks/use_agent_builder_availability';
import { EntityTypeToIdentifierField } from '../../../../common/entity_analytics/types';
import type { EntityType } from '../../../../common/search_strategy';
import { NewAgentBuilderAttachment } from '../../../agent_builder/components/new_agent_builder_attachment';
import { useAgentBuilderAttachment } from '../../../agent_builder/hooks/use_agent_builder_attachment';
import { useAskAiAssistant } from './use_ask_ai_assistant';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import type { AgentBuilderAddToChatTelemetry } from '../../../agent_builder/hooks/use_report_add_to_chat';

export interface AiAssistantButtonProps<T extends EntityType> {
  entityType: T;
  entityName: string;
  telemetryPathway: AgentBuilderAddToChatTelemetry['pathway'];
}

const CURRENT_REPLACEMENTS = {} as const;

export const AiAssistantButton = <T extends EntityType>({
  entityType,
  entityName,
  telemetryPathway,
}: AiAssistantButtonProps<T>) => {
  const entityField = EntityTypeToIdentifierField[entityType];
  const { data: anonymizationFields } = useFetchAnonymizationFields();
  const { isAgentBuilderEnabled, isAgentChatExperienceEnabled } = useAgentBuilderAvailability();

  const { anonymizedValues, replacements }: AnonymizedValues = useMemo(() => {
    if (!anonymizationFields.data) {
      return { anonymizedValues: [], replacements: CURRENT_REPLACEMENTS };
    }

    return getAnonymizedValues({
      anonymizationFields: anonymizationFields.data,
      currentReplacements: CURRENT_REPLACEMENTS,
      field: entityField,
      getAnonymizedValue,
      rawData: { [entityField]: [entityName] },
    });
  }, [anonymizationFields, entityField, entityName]);

  const anonymizedEntityName = anonymizedValues[0] ?? entityName;
  const getPromptContext = useCallback(
    async () =>
      `### The following entity is under investigation:\nType: ${entityType}\nIdentifier: ${`\`${anonymizedEntityName}\``}`,
    [anonymizedEntityName, entityType]
  );

  const { showAssistantOverlay, disabled: aiAssistantDisable } = useAskAiAssistant({
    title: `Explain ${entityType} '${entityName}' Risk Score`,
    description: `Entity: ${entityName}`,
    suggestedPrompt: ENTITY_PROMPT,
    getPromptContext,
    replacements,
  });

  const entityAttachment = useMemo(
    () => ({
      attachmentType: SecurityAgentBuilderAttachments.entity,
      attachmentData: {
        identifierType: entityType,
        identifier: entityName,
        attachmentLabel: `${entityType}: ${entityName}`,
      },
      attachmentPrompt: ENTITY_PROMPT,
    }),
    [entityName, entityType]
  );
  const { openAgentBuilderFlyout } = useAgentBuilderAttachment(entityAttachment);

  if (aiAssistantDisable && !isAgentBuilderEnabled) {
    return null;
  }

  if (isAgentChatExperienceEnabled) {
    return (
      <NewAgentBuilderAttachment
        onClick={openAgentBuilderFlyout}
        telemetry={{ pathway: telemetryPathway, attachments: ['entity'] }}
      />
    );
  }

  return (
    <EuiButton
      data-test-subj="ai-assistant-button"
      iconType={AssistantIcon}
      iconSide="right"
      onClick={() => {
        showAssistantOverlay();
      }}
    >
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.aiAssistantButton.askAiAssistant"
        defaultMessage="Ask AI Assistant"
      />
    </EuiButton>
  );
};

AiAssistantButton.displayName = 'AiAssistantButton';
