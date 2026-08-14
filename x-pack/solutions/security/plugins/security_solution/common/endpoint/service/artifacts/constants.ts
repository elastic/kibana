/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntryMatch } from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_ARTIFACT_LIST_IDS } from '@kbn/securitysolution-list-constants';
import { ENDPOINT_ARTIFACT_OPERATORS } from '@kbn/securitysolution-list-utils';

export const BY_POLICY_ARTIFACT_TAG_PREFIX = 'policy:';

export const GLOBAL_ARTIFACT_TAG = `${BY_POLICY_ARTIFACT_TAG_PREFIX}all`;

export const ADVANCED_MODE_TAG = 'form_mode:advanced';

/** The tag name for process descendants in event filters */
export const FILTER_PROCESS_DESCENDANTS_TAG = 'filter_process_descendants';

/** The tag name for process descendants in trusted apps */
export const TRUSTED_PROCESS_DESCENDANTS_TAG = 'trust_process_descendants';

/**
 * The tag prefix that narrows a process descendants event filter down to a set of event
 * categories, e.g. `descendant_event_scope:file,library`. Only meaningful together with
 * `FILTER_PROCESS_DESCENDANTS_TAG`. When absent, events of every category produced by the
 * descendants are filtered (the original, all-or-nothing behaviour).
 */
export const DESCENDANT_EVENT_SCOPE_TAG_PREFIX = 'descendant_event_scope:';

/**
 * The event categories a process descendants event filter can be scoped to.
 *
 * NOTE: the order of this array is the canonical order used when emitting the scope into an
 * artifact, so that the very same scope always produces the very same artifact hash.
 */
export const DESCENDANT_EVENT_SCOPE_CATEGORIES = Object.freeze([
  'api',
  'dns',
  'file',
  'library',
  'network',
  'process',
  'registry',
  'security',
] as const);

export type DescendantEventScopeCategory = (typeof DESCENDANT_EVENT_SCOPE_CATEGORIES)[number];

/** The tag prefix that tracks the space(s) that is considered the "owner" of the artifact.  */
export const OWNER_SPACE_ID_TAG_PREFIX = 'ownerSpaceId:';

export const PROCESS_DESCENDANT_EXTRA_ENTRY: EntryMatch = Object.freeze({
  field: 'event.category',
  operator: 'included',
  type: 'match',
  value: 'process',
});

export const PROCESS_DESCENDANT_EXTRA_ENTRY_TEXT: string = `${
  PROCESS_DESCENDANT_EXTRA_ENTRY.field
} ${
  ENDPOINT_ARTIFACT_OPERATORS.find(({ type }) => type === PROCESS_DESCENDANT_EXTRA_ENTRY.type)
    ?.message
} ${PROCESS_DESCENDANT_EXTRA_ENTRY.value}`;

// TODO: refact all uses of `ALL_ENDPOINT_ARTIFACTS_LIST_IDS to sue new const from shared package
export const ALL_ENDPOINT_ARTIFACT_LIST_IDS = ENDPOINT_ARTIFACT_LIST_IDS;

export const DEFAULT_EXCEPTION_LIST_ITEM_SEARCHABLE_FIELDS: Readonly<string[]> = [
  `name`,
  `description`,
  `entries.value`,
  `entries.entries.value`,
  `item_id`,
];
