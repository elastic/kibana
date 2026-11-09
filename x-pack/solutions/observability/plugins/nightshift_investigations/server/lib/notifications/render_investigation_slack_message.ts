/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonObject } from '@kbn/utility-types';
import type { KibanaIsomerRuntime } from '@kbn/isomer';
import type { InvestigationMessageParams } from './investigation_composition';
import { buildInvestigationComposition } from './investigation_composition';

/** A Block Kit block as the JSON the Slack connector posts. */
export type SlackBlock = JsonObject & { type: string };

/**
 * The message to post: the composition's Block Kit blocks, and its text render (escaped for mrkdwn
 * and clamped to Slack's limit), which Slack shows in notifications and wherever blocks can't render.
 */
export const renderInvestigationSlackMessage = (
  runtime: KibanaIsomerRuntime,
  params: InvestigationMessageParams
): { text: string; blocks: SlackBlock[] } => {
  const { text, blocks } = runtime.surfaces.slack.render(buildInvestigationComposition(params));
  // The SDK types blocks as interfaces, which TypeScript won't read as JSON; they are plain JSON.
  const json: SlackBlock[] = JSON.parse(JSON.stringify(blocks));
  return { text, blocks: json };
};
