/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';
import { evaluate } from '../../src/evaluate';

/**
 * list_watchlists tool routing evals.
 *
 * These specs validate that the entity-analytics skill correctly routes:
 * - watchlist-discovery queries (e.g. "what watchlists do we have") to the
 *   `security.list_watchlists` tool;
 * - "who is on watchlist X" queries to the `security.list_watchlists` →
 *   `security.search_entities` chain (resolve name to id, then search by
 *   watchlist membership);
 * - "which watchlists is this entity on" queries to `security.get_entity`
 *   (NOT to `security.list_watchlists`) — the watchlists an entity belongs to
 *   are already on the entity profile as `entity.attributes.watchlists`.
 *
 * Tool routing assertions work without pre-seeded data; the tools may return
 * "no watchlists" / "entity not found" but the calls themselves must still be
 * made. For grounded criteria (verifying actual watchlist names, members, etc.)
 * seed the entity store and create watchlists using the
 * security-documents-generator populate script.
 */
evaluate.describe(
  'SIEM Entity Analytics V2 Skill - List Watchlists',
  { tag: tags.serverless.security.complete },
  () => {
    evaluate('list watchlists questions', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'entity-analytics-v2: list watchlists',
          description:
            'Questions that should route to the security.list_watchlists tool (and the list → search_entities chain for named-watchlist member queries) in Entity Store V2 mode',
          examples: [
            {
              input: {
                question: 'What watchlists do we have configured?',
              },
              output: {
                criteria: [
                  'List the watchlists configured in the current space, including the name and id for each watchlist, or clearly state that no watchlists are configured.',
                  'Include the watchlist description when present.',
                  'Do not fabricate watchlist data.',
                ],
                toolCalls: [
                  {
                    id: 'security.list_watchlists',
                    criteria: [
                      'The tool is called to enumerate watchlists. nameContains should be omitted (the user did not name a specific watchlist).',
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'Who is on the Privileged Users watchlist?',
              },
              output: {
                criteria: [
                  'Resolve the watchlist named "Privileged Users" to its id, then list its members, or clearly state that no such watchlist exists / it has no members.',
                  'Present member entities with risk score and risk level where available.',
                  'Do not fabricate watchlist or entity data.',
                ],
                toolCalls: [
                  {
                    id: 'security.list_watchlists',
                    criteria: [
                      'The tool is called with a nameContains parameter matching "Privileged Users" (or a distinctive substring like "privileged") to resolve the watchlist id.',
                    ],
                  },
                  {
                    id: 'security.search_entities',
                    criteria: [
                      'The tool is called with a watchlists parameter containing the id resolved from the security.list_watchlists call, to enumerate members of the watchlist.',
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'Which watchlists is host server01 on?',
              },
              output: {
                criteria: [
                  "Derive the host's watchlist memberships from its entity profile (entity.attributes.watchlists) using security.get_entity, or clearly state the entity was not found.",
                  "Do NOT call security.list_watchlists for this question — the watchlists an entity belongs to are already on the entity profile; security.list_watchlists is for discovering which watchlists exist, not for finding a specific entity's memberships.",
                  'Do not fabricate entity or watchlist data.',
                ],
                toolCalls: [
                  {
                    id: 'security.get_entity',
                    criteria: [
                      'The tool is called with an entityId matching "server01" or "host:server01".',
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
          ],
        },
      });
    });
  }
);
