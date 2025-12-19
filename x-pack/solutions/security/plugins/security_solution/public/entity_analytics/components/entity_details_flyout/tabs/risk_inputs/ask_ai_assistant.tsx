/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { AssistantIcon } from '@kbn/ai-assistant-icon';
import { getAnonymizedValues } from '@kbn/elastic-assistant-common/impl/data_anonymization/get_anonymized_values';
import { getAnonymizedValue } from '@kbn/elastic-assistant-common';
import { useFetchAnonymizationFields } from '@kbn/elastic-assistant';
import type { AnonymizedValues } from '@kbn/elastic-assistant-common/impl/data_anonymization/types';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { useAgentBuilderAvailability } from '../../../../../agent_builder/hooks/use_agent_builder_availability';
import { EntityTypeToIdentifierField } from '../../../../../../common/entity_analytics/types';
import type { EntityType } from '../../../../../../common/search_strategy';
import { NewAgentBuilderAttachment } from '../../../../../agent_builder/components/new_agent_builder_attachment';
import { useAgentBuilderAttachment } from '../../../../../agent_builder/hooks/use_agent_builder_attachment';
import { useAskAiAssistant } from './use_ask_ai_assistant';
import { SecurityAgentBuilderAttachments } from '../../../../../../common/constants';

export interface ExplainWithAiAssistantProps<T extends EntityType> {
  entityType: T;
  entityName: string;
}

const CURRENT_REPLACEMENTS = {} as const;

export const AskAiAssistant = <T extends EntityType>({
  entityType,
  entityName,
}: ExplainWithAiAssistantProps<T>) => {
  const entityField = EntityTypeToIdentifierField[entityType];
  const { data: anonymizationFields } = useFetchAnonymizationFields();
  const isAssistantToolDisabled = useIsExperimentalFeatureEnabled('riskScoreAssistantToolDisabled');
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
    suggestedPrompt: `Explain how inputs contributed to the risk score, including any risk modifiers such as asset criticality or privileged user monitoring status. Additionally, outline the recommended next steps for investigating or mitigating the risk if the entity is deemed risky.\nTo answer risk score questions, fetch the risk score information and take into consideration both the risk score inputs and any modifiers that adjusted the final score.`,
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
      attachmentPrompt: `Explain how inputs contributed to the risk score, including any risk modifiers such as asset criticality or privileged user monitoring status. Additionally, outline the recommended next steps for investigating or mitigating the risk if the entity is deemed risky.\nTo answer risk score questions, fetch the risk score information and take into consideration both the risk score inputs and any modifiers that adjusted the final score.`,
    }),
    [entityName, entityType]
  );
  const { openAgentBuilderFlyout } = useAgentBuilderAttachment(entityAttachment);

  if ((aiAssistantDisable || isAssistantToolDisabled) && !isAgentBuilderEnabled) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="m" />
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          {isAgentChatExperienceEnabled ? (
            <NewAgentBuilderAttachment
              onClick={openAgentBuilderFlyout}
              telemetry={{
                pathway: 'entity_risk_contribution',
                attachments: ['entity'],
              }}
            />
          ) : (
            <EuiButton
              data-test-subj="explain-with-ai-button"
              iconType={AssistantIcon}
              iconSide="right"
              onClick={() => {
                showAssistantOverlay();
              }}
            >
              <FormattedMessage
                id="xpack.securitySolution.flyout.entityDetails.riskInputs.askAiAssistant"
                defaultMessage="Ask AI Assistant"
              />
            </EuiButton>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

AskAiAssistant.displayName = 'ExplainWithAiAssistant';
