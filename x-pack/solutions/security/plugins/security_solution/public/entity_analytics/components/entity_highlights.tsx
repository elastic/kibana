/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiButton,
  EuiHorizontalRule,
  EuiIcon,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import {
  useChatComplete,
  useFetchAnonymizationFields,
  useLoadConnectors,
} from '@kbn/elastic-assistant';
import React from 'react';
import { css } from '@emotion/css';
import { ENTITY_DETAILS_HIGHLIGH_INTERNAL_URL } from '../../../common/entity_analytics/entity_analytics/constants';
import type { EntityType } from '../../../common/search_strategy';
import { useKibana } from '../../common/lib/kibana/use_kibana';
import { useGlobalTime } from '../../common/containers/use_global_time';

interface AssistantResponse {
  highlights: {
    title: string;
    description: string;
  }[];
  recommendedAction: string;
}

export const EntityHighlightsAccordion: React.FC<{
  entityIdentifier: string;
  entityType: EntityType;
}> = ({ entityType, entityIdentifier }) => {
  const { http } = useKibana().services;
  const { euiTheme } = useEuiTheme();

  const { from, to } = useGlobalTime();
  const { data: anonymizationFields } = useFetchAnonymizationFields();

  const { data: aiConnectors } = useLoadConnectors({
    http,
  });

  const listStyle = css`
    list-style-type: disc;
    margin-bottom: 20px;
    margin-left: ${euiTheme.size.l};
    line-height: ${useEuiFontSize('s').lineHeight};
    li {
      margin-bottom: ${euiTheme.size.s};
    }
  `;

  const selectedConnector = aiConnectors?.[0];
  const connectorId = selectedConnector?.id ?? '';

  const { abortStream, sendMessage, isLoading } = useChatComplete({
    connectorId,
  });

  const [assistantResponse, setAssistantResponse] = React.useState<AssistantResponse | null>(null);

  const messageFormatting = `Return **only a single-line stringified JSON object** without any code fences, explanations, or variable assignments. Do **not** wrap the output in triple backticks or any Markdown code block. 
  The result must be a valid stringified JSON object that can be directly parsed with JSON.parse() in JavaScript.
  Generate summaries for the following sections, but omit any section that if the information isn't available in the context:
  - Risk score: Summarize the entity's risk score and the main factors contributing to it.
  - Criticality: Note the entity's criticality level and its impact on the risk score.
  - Vulnerabilities: Summarize any significant Vulnerability and briefly explain why it is significant.
  - Misconfigurations: Summarize any significant Misconfiguration and briefly explain why it is significant.
  - Anomalies: Summarize unusual activities or anomalies detected for the entity and briefly explain why it is significant.
  **Strict rules**:
  - The output must **not** include any code blocks (no triple backticks).
  - The output must be **a string**, ready to be passed directly into JSON.parse().
  - All backslashes (\\) must be escaped so that the string parses correctly in JavaScript.
  - The JSON must follow this structure:
    {{
      highlights: [{title: "Item title", description: "Short paragraph without any formatting or new line containing the summary"}],
      recommendedAction: "short paragraph with recommended action"
    }}
  - Never return an item which there is no data available in the context.
  - Does not repeat the highlight title in highlight description.
  - The highlights text should just be text. It does not need any titles or leading items in bold.
  - Markdown formatting should be used inside string values:
    - Use inline code (backticks) for technical values like file paths, process names, arguments, etc.
    - Use **bold** for emphasis.
    - Use - for bullet points.
  - **Do not** include any extra explanation or text. Only return the stringified JSON object.
  `;

  const callAssistantCba = React.useCallback(async () => {
    // call the highlight endpoint
    const { summary, replacements } = await http.fetch(ENTITY_DETAILS_HIGHLIGH_INTERNAL_URL, {
      version: '1',
      method: 'POST',
      body: JSON.stringify({
        entityType,
        entityIdentifier,
        anonymizationFields: anonymizationFields.data,
        from: new Date(from).getTime(),
        to: new Date(to).getTime(),
      }),
    });

    // export const ALERT_SUMMARY_500 = `Evaluate the cyber security alert from the context above. Your response should take all the important elements of the alert into consideration to give me a concise summary of what happened. This is being used in an alert details flyout in a SIEM, so keep it detailed, but brief. Limit your response to 500 characters. Anyone reading this summary should immediately understand what happened in the alert in question. Only reply with the summary, and nothing else.
    const rawResponse = await sendMessage({
      message: `Generate highlights for entity. Your response should take all the important elements of the entity into consideration to give me concise highlights of what is important. Limit your response to 500 characters. Anyone reading this summary should immediately understand the key insights about the entity in question. Only reply with the highlights, and nothing else. Use bullet points where possible.
      Format: ${messageFormatting}
      Context: ### The following entity is under investigation:
        Type: \`${entityType}\`
        Identifier: \`${entityIdentifier}\`
        ${JSON.stringify(summary, null, 2)}
      `,
      replacements,
      query: {
        content_references_disabled: true,
      },
    });

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(rawResponse.response);
    } catch (e) {
      // AI did not return the expected JSON
      parsedResponse = {};
    }

    setAssistantResponse(parsedResponse);
  }, [
    anonymizationFields,
    entityIdentifier,
    entityType,
    from,
    http,
    messageFormatting,
    sendMessage,
    to,
  ]);

  return (
    <>
      <EuiAccordion
        initialIsOpen
        id="asset-criticality-selector"
        buttonContent={
          <EuiText size="m">
            <strong>
              {'Entity highlights'} <EuiIcon type={'sparkles'} />
            </strong>
          </EuiText>
        }
        data-test-subj="asset-criticality-selector"
      >
        <EuiSpacer size="m" />
        {assistantResponse && (
          <div>
            <EuiText size="s">
              <ul className={listStyle}>
                {assistantResponse.highlights.map((h, i) => (
                  <li key={i}>
                    <strong>
                      {h.title}
                      {`:`}
                    </strong>{' '}
                    {h.description}
                  </li>
                ))}
              </ul>
              {assistantResponse.recommendedAction && (
                <>
                  <EuiSpacer size="xs" />
                  <div>
                    <strong>{'Recommended action: '}</strong>
                    {assistantResponse.recommendedAction}
                  </div>
                </>
              )}
            </EuiText>
          </div>
        )}

        {isLoading && (
          <div>
            <EuiText size="xs" color="subdued">
              {'Generating AI highlights and recommended actions...'}
              <EuiSpacer size="xs" />
            </EuiText>
            <EuiSkeletonText lines={4} />
          </div>
        )}

        {!assistantResponse && !isLoading && (
          <EuiButton
            iconType="sparkles"
            size="s"
            iconSide="left"
            onClick={callAssistantCba}
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
