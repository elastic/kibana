/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@elastic/ebt/client';
import type { WikiEditAction, WikiEntityType } from '../../common/wiki';

export const NIGHTSHIFT_WIKI_HYDRATED_EVENT_TYPE = 'nightshift_wiki_hydrated';
export const NIGHTSHIFT_WIKI_EDIT_APPLIED_EVENT_TYPE = 'nightshift_wiki_edit_applied';

/**
 * Ids that tie a Wiki event back to the run that produced it. Both are optional because the
 * emit sites run as agent hooks: `beforeAgent` only knows the conversation, `afterExecution` also
 * knows the round. Join through `conversation_id` to reach the investigation record.
 */
interface WikiRunIdProps {
  conversation_id?: string;
  round_id?: string;
}

export interface WikiHydratedProps extends WikiRunIdProps {
  page_count: number;
  entity_type?: WikiEntityType;
}

export interface WikiEditAppliedProps extends WikiRunIdProps {
  action: WikiEditAction;
  entity_type: WikiEntityType;
  edit_count: number;
}

const runIdSchema: RootSchema<WikiRunIdProps> = {
  conversation_id: {
    type: 'keyword',
    _meta: {
      description:
        'Agent Builder conversation the round belongs to. Recorded on the investigation once it settles, so it is the join key back to the run.',
      optional: true,
    },
  },
  round_id: {
    type: 'keyword',
    _meta: {
      description: 'Conversation round the event was emitted for.',
      optional: true,
    },
  },
};

const wikiHydratedSchema: RootSchema<WikiHydratedProps> = {
  ...runIdSchema,
  page_count: {
    type: 'long',
    _meta: {
      description:
        'Pages of this entity type materialized into the sandbox. One event per entity type present, plus a single zero-count event when the wiki is empty.',
    },
  },
  entity_type: {
    type: 'keyword',
    _meta: {
      description: 'Wiki entity type the page count is for. Unset when the wiki is empty.',
      optional: true,
    },
  },
};

const wikiEditAppliedSchema: RootSchema<WikiEditAppliedProps> = {
  ...runIdSchema,
  action: {
    type: 'keyword',
    _meta: {
      description: 'Edit the optimizer applied: upsert, corroborate, or archive.',
    },
  },
  entity_type: {
    type: 'keyword',
    _meta: {
      description: 'Wiki entity type the edits were applied to.',
    },
  },
  edit_count: {
    type: 'long',
    _meta: {
      description:
        'Edits applied for this action and entity type. Proposals that matched no page are not counted.',
    },
  },
};

export const wikiHydratedEventType = {
  eventType: NIGHTSHIFT_WIKI_HYDRATED_EVENT_TYPE,
  schema: wikiHydratedSchema,
};

export const wikiEditAppliedEventType = {
  eventType: NIGHTSHIFT_WIKI_EDIT_APPLIED_EVENT_TYPE,
  schema: wikiEditAppliedSchema,
};
