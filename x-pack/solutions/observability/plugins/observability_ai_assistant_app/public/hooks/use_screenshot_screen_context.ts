/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAIAssistantAppService } from '@kbn/ai-assistant';
import {
  MessageRole,
  concatenateChatCompletionChunks,
} from '@kbn/observability-ai-assistant-plugin/public';
import { omit } from 'lodash';
import { useEffect } from 'react';
import { lastValueFrom } from 'rxjs';

export function useScreenshotScreenContext() {
  const service = useAIAssistantAppService();

  useEffect(() => {
    return service.setScreenContext({
      instructions: `To see what is on the user's screen, you must use the
      "get_visual_description_of_screen" function. Use this when:

      - they are asking about UI components or data that is not already available to you
      - they ask for help related to the current page`,
      actions: [
        {
          name: 'get_visual_description_of_screen',
          description: `This takes a screenshot of the page, and returns a
          plain text description of the content of the page, in the context
          of the user's question, which you can use to inform your decision.`,
          respond: async ({ messages, connectorId, client, signal }) => {
            const html2canvas = await import('html2canvas');

            const container = document.body;

            const element = await html2canvas.default(container);

            const response = await lastValueFrom(
              client
                .chat('generate_screenshot_description', {
                  connectorId,
                  scopes: service.getScopes(),
                  signal,
                  systemMessage: '',
                  messages: [
                    {
                      '@timestamp': new Date().toISOString(),
                      message: {
                        role: MessageRole.User,
                        content: `You have taken a screenshot of the page. Describe the contents
                    of the screenshot in context of the previous conversation. This description
                    will be used in the conversation to answer the user's request. Make sure
                    you mention data values and describe trends in visualizations if they're needed
                    to answer the user's request. Describe this in as much detail as possible,
                    mentioning timestamps, legend values, spikes, dips, etc.
                    
                    ## Previous conversation
                    
                    ${JSON.stringify(
                      messages.map((message) => {
                        return omit(message.message, 'data');
                      })
                    )}`,
                        attachments: [
                          {
                            type: 'image',
                            title: `Screenshot of page`,
                            source: {
                              data: element.toDataURL('image/png'),
                              mimeType: 'image/png',
                            },
                          },
                        ],
                      },
                    },
                  ],
                })
                .pipe(concatenateChatCompletionChunks())
            );

            return {
              content: response.message.content,
            };
          },
        },
      ],
    });
  }, [service]);
}
