/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { ParsedTinesStory, TinesStoryExport } from './types';
import { TINES_AGENT_TYPES } from './types';
import { slugifyStepName } from './slugify_step_name';

const TinesAgentSchema = z
  .object({
    type: z.string().min(1),
    name: z.string().min(1),
    guid: z.string().min(1),
    disabled: z.boolean().optional(),
    description: z.string().nullable().optional(),
    options: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

const TinesLinkSchema = z
  .object({
    source: z.number().int().nonnegative(),
    receiver: z.number().int().nonnegative(),
  })
  .passthrough();

export const TinesStoryExportSchema = z
  .object({
    name: z.string().min(1),
    // Real Tines exports often set description to null rather than omitting it.
    description: z.string().nullable().optional(),
    guid: z.string().optional(),
    tags: z.array(z.string()).optional(),
    agents: z.array(TinesAgentSchema).min(1),
    links: z.array(TinesLinkSchema).optional(),
  })
  .passthrough();

/**
 * Validates and normalizes a Tines story export JSON document into
 * {@link ParsedTinesStory} for downstream graph/template/mapping stages.
 */
export class TinesStoryParser {
  public static parse(raw: unknown): ParsedTinesStory {
    const parsed = TinesStoryExportSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(
        `Invalid Tines story export: ${parsed.error.issues
          .map((issue) => issue.message)
          .join(', ')}`
      );
    }

    return TinesStoryParser.fromExport(parsed.data as TinesStoryExport);
  }

  public static fromExport(exportData: TinesStoryExport): ParsedTinesStory {
    const enabledAgents = exportData.agents.filter((agent) => !agent.disabled);

    if (enabledAgents.length === 0) {
      throw new Error('Tines story export contains no enabled agents');
    }

    const links = exportData.links ?? [];
    const agentCount = exportData.agents.length;

    for (const link of links) {
      if (link.source >= agentCount || link.receiver >= agentCount) {
        throw new Error(
          `Tines story link references out-of-range agent index (source=${link.source}, receiver=${link.receiver}, agents=${agentCount})`
        );
      }
    }

    const usedStepNames = new Set<string>();

    const agents = exportData.agents.map((agent, index) => {
      let stepName = slugifyStepName(agent.name);
      let suffix = 1;
      while (usedStepNames.has(stepName)) {
        stepName = `${slugifyStepName(agent.name)}_${suffix}`;
        suffix += 1;
      }
      usedStepNames.add(stepName);

      const incomingLinks = links
        .filter((link) => link.receiver === index)
        .map((link) => link.source);
      const outgoingLinks = links
        .filter((link) => link.source === index)
        .map((link) => link.receiver);

      return {
        ...agent,
        index,
        stepName,
        incomingLinks,
        outgoingLinks,
      };
    });

    const hasWebhookEntry = agents.some(
      (agent) => !agent.disabled && agent.type === TINES_AGENT_TYPES.WEBHOOK
    );

    return {
      name: exportData.name,
      description: exportData.description ?? '',
      guid: exportData.guid,
      tags: exportData.tags ?? [],
      agents,
      links,
      hasWebhookEntry,
    };
  }
}
