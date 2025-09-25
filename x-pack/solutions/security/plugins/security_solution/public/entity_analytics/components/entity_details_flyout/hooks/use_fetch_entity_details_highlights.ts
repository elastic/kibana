/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useState } from 'react';
import { useChatComplete } from '@kbn/elastic-assistant';
import type { AnonymizationFieldResponse, Replacements } from '@kbn/elastic-assistant-common';
import { i18n } from '@kbn/i18n';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useEntityAnalyticsRoutes } from '../../../api/api';
import { getAnonymizedEntityIdentifier } from '../utils/helpers';

const llmPrompt = `Generate markdown text with most important information for entity so a Security analyst can act. Your response should take all the important elements of the entity into consideration. Limit your response to 500 characters. Only reply with the required sections, and nothing else.
### Format
Return a string with markdown text without any explanations, or variable assignments. Do **not** wrap the output in triple backticks. 
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

export const useFetchEntityDetailsHighlights = ({
  connectorId,
  anonymizationFields,
  entityType,
  entityIdentifier,
}: {
  connectorId: string;
  anonymizationFields: AnonymizationFieldResponse[];
  entityType: string;
  entityIdentifier: string;
}) => {
  const { fetchEntityDetailsHighlights } = useEntityAnalyticsRoutes();
  const { addError } = useAppToasts();
  const { from, to } = useGlobalTime();
  const [assistantResult, setAssistantResult] = useState<{
    aiResponse: string;
    replacements: Replacements;
    formattedEntitySummary: string;
  } | null>(null);
  const {
    abortStream,
    sendMessage,
    isLoading: isChatLoading,
  } = useChatComplete({
    connectorId,
  });

  const fetchEntityHighlights = useCallback(async () => {
    const { summary, replacements } = await fetchEntityDetailsHighlights({
      entityType,
      entityIdentifier,
      anonymizationFields,
      from: new Date(from).getTime(),
      to: new Date(to).getTime(),
    });

    const summaryFormatted = JSON.stringify(summary);

    const rawResponse = await sendMessage({
      message: `${llmPrompt}.      
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
    });
  }, [
    addError,
    entityIdentifier,
    entityType,
    fetchEntityDetailsHighlights,
    from,
    sendMessage,
    anonymizationFields,
    to,
  ]);

  return {
    fetchEntityHighlights,
    isChatLoading,
    abortStream,
    result: assistantResult,
  };
};
