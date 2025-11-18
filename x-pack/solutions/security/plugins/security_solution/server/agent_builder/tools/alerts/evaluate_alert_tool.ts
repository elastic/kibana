/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import { HumanMessage } from '@langchain/core/messages';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { securityTool } from '../constants';

const evaluateAlertSchema = z.object({
  alertData: z
    .string()
    .describe(
      'The filtered alert data in key-value format (comma-separated, newline-delimited). Contains only essential fields for security analysis.'
    ),
});

export const EVALUATE_ALERT_TOOL_ID = securityTool('evaluate-alert');

const EVALUATION_PROMPT = `You are a security analyst evaluating a security alert. Analyze the alert data provided and generate a comprehensive evaluation report.

SECURITY ALERT DATA:

{alertData}

---

EVALUATION REQUIREMENTS

Evaluate the security event described above and provide a structured, markdown-formatted summary suitable for inclusion in an Elastic Security case. Base your analysis solely on the alert data provided above. Your response must include:

1. 📝 Event Description
  - Summarize the event using only the information from the alert data above.
  - Include user and host information, risk scores, and severity from the provided context.
  - Reference relevant MITRE ATT&CK techniques based on the event details, with hyperlinks to the official MITRE pages.

2. 🔍 Triage Steps
  - List clear, bulleted triage steps tailored to Elastic Security workflows (e.g., alert investigation, timeline creation, entity analytics review).
  - Base recommendations on the alert fields provided (e.g., host.name, user.name, source.ip, destination.ip).
  - Highlight the detection rule mentioned in the alert data.

3. 🛡️ Recommended Actions
  - Provide prioritized response actions based on the alert data:
    - Elastic Defend endpoint response actions (e.g., isolate host, kill process, retrieve/delete file), with links to Elastic documentation.
    - Example ES|QL queries for further investigation using the fields from the alert (host.name, user.name, IPs, timestamps), formatted as code blocks.
    - Example OSQuery Manager queries for further investigation, formatted as code blocks.
    - Guidance on using Timelines and Entity Analytics for deeper context, with documentation links.

4. 📚 MITRE ATT&CK Context
  - Analyze the event category and rule description to identify relevant MITRE ATT&CK techniques.
  - Provide actionable recommendations based on MITRE guidance, with hyperlinks.

5. 🔗 Documentation Links
  - Include direct links to all referenced Elastic Security documentation and MITRE ATT&CK pages.

Formatting Requirements:
  - Use markdown headers, tables, and code blocks for clarity.
  - Organize the response into visually distinct sections.
  - Use concise, actionable language.
  - Include relevant emojis in section headers for visual clarity (e.g., 📝, 🛡️, 🔍, 📚).

Generate the complete evaluation report now:`;

export const evaluateAlertTool = (): BuiltinToolDefinition<typeof evaluateAlertSchema> => {
  return {
    id: EVALUATE_ALERT_TOOL_ID,
    type: ToolType.builtin,
    description: `Evaluates a security alert and generates a comprehensive, structured markdown report suitable for inclusion in an Elastic Security case. The tool analyzes alert data and provides event description, triage steps, recommended actions, MITRE ATT&CK context, and documentation links.

CRITICAL INSTRUCTION: This tool returns a COMPLETE FINAL ANSWER in the 'answer' field. You MUST return this answer EXACTLY as-is without any modification, summarization, or additional commentary. Copy the entire 'answer' field content verbatim and return it directly to the user. Do NOT synthesize, summarize, or rephrase this content.`,
    schema: evaluateAlertSchema,
    handler: async ({ alertData }, { modelProvider, logger }) => {
      logger.debug(`evaluate-alert tool called with alert data length: ${alertData.length}`);

      try {
        const model = await modelProvider.getDefaultModel();
        const prompt = EVALUATION_PROMPT.replace('{alertData}', alertData);

        const response = await model.chatModel.invoke([new HumanMessage(prompt)]);

        const evaluationText =
          typeof response.content === 'string'
            ? response.content
            : Array.isArray(response.content)
              ? response.content.map((c) => (typeof c === 'string' ? c : c.text || '')).join('')
              : String(response.content);

        return {
          results: [
            {
              type: 'other',
              data: {
                answer: evaluationText,
                _verbatim: true,
                _finalAnswer: true,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in evaluate-alert tool: ${error.message}`);
        return {
          results: [
            {
              type: 'error',
              data: {
                message: `Error evaluating alert: ${error.message}`,
              },
            },
          ],
        };
      }
    },
    tags: ['security', 'alerts', 'evaluation'],
  };
};

