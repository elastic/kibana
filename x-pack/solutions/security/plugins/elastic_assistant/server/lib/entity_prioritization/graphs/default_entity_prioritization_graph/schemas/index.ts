/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

import type { CombinedPrompts } from '..';

export const getSelectCandidatesSchema = () =>
  z.object({
    selectedEntityIds: z
      .array(z.string())
      .describe('Array of entity IDs that should be enriched for further analysis'),
  });

export const getThreatHuntingPrioritiesGenerationSchema = (prompts: CombinedPrompts) =>
  z.object({
    priorities: z
      .array(
        z.object({
          title: z
            .string()
            .describe('A few words summarizing the threat (e.g., "Lateral Movement Detected")'),
          byline: z
            .string()
            .describe('A single sentence expanding on the threat and providing context'),
          description: z
            .string()
            .describe(
              'A more detailed description explaining why this is a priority, what threats are indicated, and what investigation steps should be taken'
            ),
          entities: z
            .array(
              z.object({
                type: z.enum(['user', 'host']).describe('The type of entity'),
                idField: z
                  .string()
                  .describe(
                    'The field name that identifies this entity (e.g., "host.name", "user.name")'
                  ),
                idValue: z.string().describe('The actual entity identifier value'),
              })
            )
            .describe(
              'Array of entities associated with this priority (can include multiple entities)'
            ),
          tags: z
            .array(z.string())
            .describe(
              'Array of tags for key themes or MITRE ATT&CK techniques (e.g., ["Lateral Movement", "Credential Access", "T1021"])'
            ),
          priority: z
            .number()
            .min(1)
            .max(10)
            .describe(prompts.priority || 'Priority score from 1-10, where 10 is highest priority'),
          chatRecommendations: z
            .array(z.string())
            .describe(
              'Array of questions the user could ask the chat agent to continue investigating this threat. Focus on Elasticsearch-related topics like risk scores, asset criticality, entity store data, alerts, vulnerabilities, anomalies, and security analytics. Each question should be a complete, actionable query (e.g., "What is the risk score history for host.example.com over the last 30 days?", "Show me all alerts associated with user john.doe in the entity store", "What is the asset criticality level for these entities?")'
            ),
        })
      )
      .describe('Array of prioritized threat hunting priorities'),
  });
