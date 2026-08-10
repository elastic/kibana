/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { GetClient } from '../routes/types';

export const triggerInvestigationStepDefinition = (getClient: GetClient) =>
  createServerStepDefinition({
    id: 'nightshift.triggerInvestigation',
    name: 'Trigger Nightshift Investigation',
    description:
      'Start an investigation for a given subject (significant event, alert, or other entity). Returns investigation_id for tracking.',
    inputSchema: z.object({
      subject_type: z
        .enum(['significant_event', 'alert'])
        .describe('The type of entity being investigated'),
      subject_id: z.string().min(1).describe('The ID of the entity being investigated'),
      context: z
        .record(z.unknown())
        .optional()
        .describe('Additional context to pass to the investigation workflow'),
    }),
    outputSchema: z.object({
      investigation_id: z.string().describe('The workflow execution ID for the started investigation'),
    }),
    handler: async (context) => {
      const request = context.contextManager.getFakeRequest();
      const client = getClient(request);
      const result = await client.start({
        subject: {
          type: context.input.subject_type,
          id: context.input.subject_id,
        },
        context: context.input.context,
      });
      return { output: result };
    },
  });
