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
 * - `accessed`: the reinforcement hydrate, filtered to the trees the investigator actually opened.
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
 * string. Join through `conversation_id` to reach the investigation record.
 */
interface DecisionTreeRunIdProps {
  conversation_id?: string;
}

export interface DecisionTreesLoadedProps extends DecisionTreeRunIdProps {
  selection: DecisionTreeSelection;
  tree_count: number;
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
        'Agent Builder conversation the run belongs to. Recorded on the investigation once it settles, so it is the join key back to the run.',
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
        'Why these trees were loaded: discover (investigator hydrate, every tree) or accessed (reinforcement hydrate, only the trees the investigator opened).',
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
        description: 'Stable symptom id (`symptom:<slug>`) of a materialized tree.',
      },
    },
    _meta: {
      description: 'Stable symptom ids of the trees materialized for this run.',
    },
  },
};

const decisionTreeWrittenSchema: RootSchema<DecisionTreeWrittenProps> = {
  ...runIdSchema,
  action: {
    type: 'keyword',
    _meta: {
      description:
        'What the submit did: create, update, reinforce, learnings_only, or rejected.',
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
