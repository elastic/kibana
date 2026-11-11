/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@elastic/ebt/client';

export const NIGHTSHIFT_DECISION_TREES_LOADED_EVENT_TYPE = 'nightshift_decision_trees_loaded';
export const NIGHTSHIFT_DECISION_TREE_WRITTEN_EVENT_TYPE = 'nightshift_decision_tree_written';

/**
 * How the trees materialized for a run were chosen:
 * - `discover`: the investigator hydrate, which writes every non-archived tree so the agent can
 *   find a match through `monitors.md`.
 * - `accessed`: the reinforcement hydrate, filtered to the trees this turn can edit. For a
 *   follow-up round that is the trees opened in any round of the investigation plus the ones its
 *   earlier reinforcement wrote, not only the ones opened in the latest round.
 */
export type DecisionTreeSelection = 'discover' | 'accessed';

/**
 * What a reinforcement submit did to a tree:
 * - `create`: a new tree persisted for a symptom that had none.
 * - `update`: an existing tree re-committed without a new causal edge.
 * - `reinforce`: an existing tree whose edit marked a newly taken edge (promotes it to established).
 * - `learnings_only`: learnings attached to an existing tree without any structural edit.
 * - `rejected`: a submission that failed guardrails and was not written.
 */
export type DecisionTreeWriteAction =
  | 'create'
  | 'update'
  | 'reinforce'
  | 'learnings_only'
  | 'rejected';

/**
 * Ties a decision-tree event back to the run that produced it. `conversation_id` is optional
 * because the load emit runs as a workflow hook where Liquid renders an absent input as an empty
 * string. An investigation is identified by its conversation, so `conversation_id` is also the
 * investigation id and the join key back to the investigation record.
 */
interface DecisionTreeRunIdProps {
  conversation_id?: string;
  round_id?: string;
}

export interface DecisionTreesLoadedProps extends DecisionTreeRunIdProps {
  selection: DecisionTreeSelection;
  tree_count: number;
  /** Hashed ids; empty for `discover`, where the full list adds nothing over `tree_count`. */
  tree_ids: string[];
}

export interface DecisionTreeWrittenProps extends DecisionTreeRunIdProps {
  action: DecisionTreeWriteAction;
  tree_count: number;
}

const runIdSchema: RootSchema<DecisionTreeRunIdProps> = {
  conversation_id: {
    type: 'keyword',
    _meta: {
      description:
        'Agent Builder conversation the run belongs to. For an investigation this is also the investigation id, so it is the join key back to it.',
      optional: true,
    },
  },
  round_id: {
    type: 'keyword',
    _meta: {
      description:
        'Investigator round the event belongs to. Set on write events and on accessed loads, where the reinforcement session knows the round; the investigator (discover) load runs before the round exists.',
      optional: true,
    },
  },
};

const decisionTreesLoadedSchema: RootSchema<DecisionTreesLoadedProps> = {
  ...runIdSchema,
  selection: {
    type: 'keyword',
    _meta: {
      description:
        'Why these trees were loaded: discover (investigator hydrate, every tree) or accessed (reinforcement hydrate, the trees this turn can edit).',
    },
  },
  tree_count: {
    type: 'long',
    _meta: {
      description:
        'Number of decision trees materialized into the sandbox for this run. Zero when no tree matched the selection.',
    },
  },
  tree_ids: {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: {
        description:
          'One-way word phrase derived from the symptom id of a materialized tree. Symptom slugs can name customer services, so the id itself is never sent.',
      },
    },
    _meta: {
      description:
        'Hashed symptom ids of the trees materialized for this run. Only sent for accessed loads; empty for discover, where every tree is loaded and the list adds nothing over tree_count. Stable across runs, so it counts how often a tree is loaded without exposing its name.',
    },
  },
};

const decisionTreeWrittenSchema: RootSchema<DecisionTreeWrittenProps> = {
  ...runIdSchema,
  action: {
    type: 'keyword',
    _meta: {
      description: 'What the submit did: create, update, reinforce, learnings_only, or rejected.',
    },
  },
  tree_count: {
    type: 'long',
    _meta: {
      description: 'Trees this action applied to. One event per distinct action.',
    },
  },
};

export const decisionTreesLoadedEventType = {
  eventType: NIGHTSHIFT_DECISION_TREES_LOADED_EVENT_TYPE,
  schema: decisionTreesLoadedSchema,
};

export const decisionTreeWrittenEventType = {
  eventType: NIGHTSHIFT_DECISION_TREE_WRITTEN_EVENT_TYPE,
  schema: decisionTreeWrittenSchema,
};
