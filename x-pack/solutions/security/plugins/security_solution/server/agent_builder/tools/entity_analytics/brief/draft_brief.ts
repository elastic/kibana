/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { once } from 'lodash';
import { z } from '@kbn/zod/v4';
import type { BoundInferenceClient, ToolSchema } from '@kbn/inference-common';
import { createInferenceInternalError } from '@kbn/inference-common';
import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import type { EntityFacts } from './types';
import { BriefDraft, DRAFT_SYSTEM_PROMPT, buildDraftMessage } from './prompts';

/** The model drafts the brief in one structured-output call, which the inference plugin retries once. */
export const draftBrief = async ({
  inferenceClient,
  scope,
  facts,
  sample,
  abortSignal,
}: {
  inferenceClient: BoundInferenceClient;
  scope: EntityAnalyticsScope;
  facts: EntityFacts[];
  sample?: string;
  abortSignal?: AbortSignal;
}): Promise<BriefDraft> => {
  const { output } = await inferenceClient.output({
    id: 'entity_analytics_ai_brief',
    system: DRAFT_SYSTEM_PROMPT,
    input: buildDraftMessage({ scope, facts, sample }),
    schema: getBriefSchema(),
    retry: { onValidationError: 1 },
    abortSignal,
  });
  const parsed = BriefDraft.safeParse(output);
  if (!parsed.success) {
    throw createInferenceInternalError(
      `The AI output did not match the brief schema: ${parsed.error.message}`
    );
  }
  return parsed.data;
};

/** `BriefDraft` as JSON schema, without `$schema` and zod's safe-integer bounds. */
const getBriefSchema = once((): ToolSchema => {
  const schema: unknown = JSON.parse(
    JSON.stringify(z.toJSONSchema(BriefDraft), (key, value) =>
      key === '$schema' || Math.abs(value) === Number.MAX_SAFE_INTEGER ? undefined : value
    )
  );
  if (!isToolSchema(schema)) {
    throw new Error('The BriefDraft schema did not convert to an object JSON schema');
  }
  return schema;
});

const isToolSchema = (value: unknown): value is ToolSchema =>
  typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  value.type === 'object' &&
  'properties' in value;
