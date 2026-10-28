/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import {
  ExceptionListItem,
  ExceptionListItemEntry,
  ExceptionListItemEntryArray,
  ExceptionListOsType,
} from '@kbn/securitysolution-exceptions-common/api';
import { MAX_INPUT_STRING_CHARS } from '../../../common/budget';
import { truncatedFlagSchema } from '../../../common/truncation';
import {
  getArtifactOwnerSpaceIds,
  getPolicyIdsFromArtifact,
  isArtifactGlobal,
  isOwnerSpaceIdTag,
  isPolicySelectionTag,
} from '../../../../../endpoint/service/artifacts/utils';
import { FAMILY_BY_LIST_ID, familySchema, osSchema } from './enums';

export const SUMMARY_NAME_MAX_CHARS = 128;
export const SUMMARY_DESCRIPTION_MAX_CHARS = 256;
export const SUMMARY_TAGS_MAX = 5;
export const SUMMARY_TAG_MAX_CHARS = 64;
export const SUMMARY_POLICY_IDS_MAX = 10;
export const SUMMARY_OS_TYPES_MAX = ExceptionListOsType.options.length;

export const artifactItemSchema = ExceptionListItem;
export type ArtifactItem = z.infer<typeof artifactItemSchema>;

export const entrySchema = ExceptionListItemEntry;
export type Entry = z.infer<typeof entrySchema>;

export const entryArraySchema = ExceptionListItemEntryArray;

export const policyScopeKindSchema = lazySchema(() => z.enum(['all', 'policies', 'unassigned']));
export type PolicyScopeKind = z.infer<typeof policyScopeKindSchema>;

export const policyScopeSchema = lazySchema(() =>
  z.object({
    kind: policyScopeKindSchema,
    policy_ids: z.array(z.string()),
    owner_space_id: z.string().optional(),
  })
);
export type PolicyScope = z.infer<typeof policyScopeSchema>;

export const policyScopeFromTags = (tags: readonly string[]): PolicyScope => {
  const artifact = { tags: [...tags] };
  const policyIds = getPolicyIdsFromArtifact(artifact);
  const [ownerSpaceId] = getArtifactOwnerSpaceIds(artifact);
  const kind = isArtifactGlobal(artifact)
    ? 'all'
    : policyIds.length >= 1
    ? 'policies'
    : 'unassigned';

  return {
    kind,
    policy_ids: policyIds,
    ...(ownerSpaceId !== undefined ? { owner_space_id: ownerSpaceId } : {}),
  };
};

export const isArtifactIdentifierTag = (tag: string): boolean =>
  isPolicySelectionTag(tag) || isOwnerSpaceIdTag(tag);

export const artifactRefSchema = lazySchema(() =>
  z.object({
    id: z.string(),
    item_id: z.string(),
    list_id: z.string(),
    family: familySchema,
    namespace_type: z.literal('agnostic'),
    _version: z.string().optional(),
    name: z.string(),
    os_types: z.array(osSchema),
    tags: z.array(z.string()),
    policy_scope: policyScopeSchema,
    updated_at: z.string(),
  })
);
export type ArtifactRef = z.infer<typeof artifactRefSchema>;

export const proposedRefSchema = lazySchema(() =>
  z.object({
    proposed: z.literal(true),
    index: z.number().int().nonnegative(),
    list_id: z.string(),
    family: familySchema,
    entries: entryArraySchema,
    os_types: z.array(osSchema),
    tags: z.array(z.string()).optional(),
    policy_scope: policyScopeSchema,
  })
);
export type ProposedRef = z.infer<typeof proposedRefSchema>;

export const artifactSummarySchema = lazySchema(() =>
  artifactRefSchema.extend({
    name: z.string().max(SUMMARY_NAME_MAX_CHARS),
    name_truncated: truncatedFlagSchema.optional(),
    os_types: z
      .array(z.string().max(MAX_INPUT_STRING_CHARS))
      .max(ExceptionListOsType.options.length),
    tags: z.array(z.string()).max(SUMMARY_TAGS_MAX),
    tags_total: z.number().int().nonnegative().optional(),
    tags_truncated: truncatedFlagSchema.optional(),
    policy_scope: policyScopeSchema.extend({
      policy_ids: z.array(z.string()).max(SUMMARY_POLICY_IDS_MAX),
      policy_ids_total: z.number().int().nonnegative().optional(),
    }),
    description: z.string().max(SUMMARY_DESCRIPTION_MAX_CHARS),
    description_truncated: truncatedFlagSchema.optional(),
    entries_summary: z.array(z.string()),
    created_at: z.string(),
  })
);
export type ArtifactSummary = z.infer<typeof artifactSummarySchema>;

export const toArtifactRef = (item: ArtifactItem): ArtifactRef => {
  const family = FAMILY_BY_LIST_ID[item.list_id as keyof typeof FAMILY_BY_LIST_ID];
  if (family === undefined) {
    throw new Error(`Unknown artifact list_id: ${item.list_id}`);
  }
  const tags = item.tags ?? [];
  const ref: ArtifactRef = {
    id: item.id,
    item_id: item.item_id,
    list_id: item.list_id,
    family,
    namespace_type: 'agnostic',
    name: item.name,
    os_types: (item.os_types ?? []).filter((value) => ExceptionListOsType.safeParse(value).success),
    tags,
    policy_scope: policyScopeFromTags(tags),
    updated_at: item.updated_at,
  };
  if (item._version !== undefined) {
    ref._version = item._version;
  }
  return artifactRefSchema.parse(ref);
};
