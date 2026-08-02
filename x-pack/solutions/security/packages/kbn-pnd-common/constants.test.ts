/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PND_RULE_PREVIEW_WORKFLOW_ID } from '@kbn/workflows/managed';

import * as constants from './constants';
import {
  PND_AUTO_RESPOND_CHANNELS,
  PND_AUTO_RESPOND_RATIONALE_PREFIX,
  PND_CANDIDATE_RULE_MAX_INDEX_PATTERNS,
  PND_CANDIDATE_RULE_MAX_QUERY_LENGTH,
  PND_CONVERSATIONS_URL,
  PND_CONVERSATION_ATTACHMENTS_URL_TEMPLATE,
  PND_DISCOVERY_CONTEXT_MAX_ALERT_IDS,
  PND_DISCOVERY_CONTEXT_URL,
  PND_PROPOSALS_ACTIVITY_URL,
  PND_PROPOSALS_AUTO_RESPOND_URL,
  PND_PROPOSALS_URL,
  PND_THREADS_ENSURE_URL,
  PND_TUNABLE_RULE_FIELDS,
  PND_TUNING_APPLY_URL_TEMPLATE,
  PND_TUNING_CANDIDATE_RULES_MAX,
  PND_TUNING_CANDIDATE_RULES_URL,
  PND_TUNING_URL,
  PND_WATCH_WORKFLOW_IDS,
  SYSTEM_SECURITY_WATCH_IDS,
  WATCH_AUTONOMY_LEVELS,
  buildConversationAttachmentsUrl,
} from './constants';

/**
 * Drift test for the resume boundary (workstream F3).
 *
 * `SYSTEM_SECURITY_WATCH_IDS` / `PND_WATCH_WORKFLOW_IDS` is the S1 resume allow-list for
 * `_respond` and `_auto_respond`, **and** the only guard on autonomy uiSettings key construction
 * against an internal SO client that has no SO-level authz. PND installs strictly more than it
 * allows resuming, so nothing may add an installed-but-not-resumable id to that array.
 *
 * The subject was the lifecycle stub until kibana-phf4.12 retired it. It is now
 * `system-security-rule-preview`, one of #283488's detection-rule workers: installed by
 * `install_static`, called by a Watch through `workflow.execute`, and never resumable — the same
 * shape the stub had, on a definition that is still here. Keeping this pin subjected on a live id
 * is the point: a guard whose subject no longer exists cannot fail.
 */
describe('installed-but-not-resumable ids (resume-boundary drift guard)', () => {
  it('is the expected managed workflow id', () => {
    expect(PND_RULE_PREVIEW_WORKFLOW_ID).toBe('system-security-rule-preview');
  });

  it('is NOT a member of SYSTEM_SECURITY_WATCH_IDS', () => {
    expect(SYSTEM_SECURITY_WATCH_IDS as readonly string[]).not.toContain(
      PND_RULE_PREVIEW_WORKFLOW_ID
    );
  });

  it('is NOT a member of PND_WATCH_WORKFLOW_IDS (the _respond / _auto_respond allow-list)', () => {
    expect(PND_WATCH_WORKFLOW_IDS as readonly string[]).not.toContain(PND_RULE_PREVIEW_WORKFLOW_ID);
  });

  it('keeps PND_WATCH_WORKFLOW_IDS an exact alias of SYSTEM_SECURITY_WATCH_IDS', () => {
    expect(PND_WATCH_WORKFLOW_IDS).toBe(SYSTEM_SECURITY_WATCH_IDS);
  });

  it('holds the resume allow-list at exactly the five managed watches', () => {
    expect(SYSTEM_SECURITY_WATCH_IDS).toHaveLength(5);
  });

  it('uses a prefix distinct from the watch ids, so a startsWith heuristic cannot re-widen the boundary', () => {
    SYSTEM_SECURITY_WATCH_IDS.forEach((watchId) => {
      expect(PND_RULE_PREVIEW_WORKFLOW_ID.startsWith(watchId)).toBe(false);
      expect(watchId.startsWith(PND_RULE_PREVIEW_WORKFLOW_ID)).toBe(false);
    });
  });

  it('keeps the `system-` prefix the managed workflow registry requires', () => {
    expect(PND_RULE_PREVIEW_WORKFLOW_ID.startsWith('system-')).toBe(true);
  });
});

/**
 * Workstream B6a. `query` joined the set once the watch started backtesting both sides of the
 * change and the approval surfaces started rendering the diff beside the two counts — a human
 * approves a measured rewrite, not a plausible sentence. `exceptions_list` is still excluded for a
 * reason the review flow does not address: `applyRulePatch` replaces the whole array rather than
 * merging it, so an LLM-authored value silently detaches every exception list already attached to
 * the rule. Suppression and `threshold` stay out because an alert count either side of them does
 * not describe what they changed.
 */
describe('PND_TUNABLE_RULE_FIELDS', () => {
  it('allows exactly the four reviewable rule fields', () => {
    expect(PND_TUNABLE_RULE_FIELDS).toEqual(['enabled', 'investigation_fields', 'note', 'query']);
  });

  it('includes query, which the backtest-and-diff review flow made reviewable', () => {
    expect(PND_TUNABLE_RULE_FIELDS as readonly string[]).toContain('query');
  });

  it('excludes exceptions_list, because a patch replaces the array rather than merging it', () => {
    expect(PND_TUNABLE_RULE_FIELDS as readonly string[]).not.toContain('exceptions_list');
  });

  it.each(['threshold', 'alert_suppression', 'type', 'index', 'actions', 'interval'])(
    'excludes "%s", which a before/after alert count cannot describe',
    (field) => {
      expect(PND_TUNABLE_RULE_FIELDS as readonly string[]).not.toContain(field);
    }
  );

  it('has no duplicate entries', () => {
    expect(new Set(PND_TUNABLE_RULE_FIELDS).size).toBe(PND_TUNABLE_RULE_FIELDS.length);
  });
});

/**
 * D12. `_auto_respond` resumes a gate exactly the way a human approval does, so the stamped
 * rationale is the **only** signal that separates the two in history. "Answered by" therefore
 * matches on this prefix, which means the writer (`_auto_respond`) and the reader (the Brief)
 * have to share one literal rather than each carrying their own copy.
 *
 * Changing this prefix orphans attribution on already-answered gates. That is accepted, not a bug.
 */
describe('PND_AUTO_RESPOND_RATIONALE_PREFIX', () => {
  it('pins the literal the _auto_respond route stamps on an auto-accepted gate', () => {
    expect(PND_AUTO_RESPOND_RATIONALE_PREFIX).toBe('Auto-accepted by PND autonomy at level ');
  });

  it('ends with a space, so `${prefix}${autonomyLevel}` reads as one sentence', () => {
    expect(PND_AUTO_RESPOND_RATIONALE_PREFIX.endsWith(' ')).toBe(true);
  });
});

describe('PND_AUTO_RESPOND_CHANNELS', () => {
  it('stamps the machine origin as pnd-autonomy-auto', () => {
    expect(PND_AUTO_RESPOND_CHANNELS.auto).toBe('pnd-autonomy-auto');
  });

  it('stamps the dial origin as pnd-autonomy-dial', () => {
    expect(PND_AUTO_RESPOND_CHANNELS.dial).toBe('pnd-autonomy-dial');
  });
});

describe('PND_PROPOSALS_AUTO_RESPOND_URL', () => {
  it('is the _auto_respond action on the proposals collection', () => {
    expect(PND_PROPOSALS_AUTO_RESPOND_URL).toBe(`${PND_PROPOSALS_URL}/_auto_respond`);
  });
});

/**
 * The one autonomy scale. It is the type on the settings contract, the value persisted in
 * `pnd:autonomy:<watchId>`, the input the gate registry resolves auto-accept against, and the
 * tick labels on the slider — so a change here is a change to all four at once. The generated
 * `WatchAutonomyLevel` codec is pinned against this array in `impl/schemas/schemas.test.ts`.
 */
describe('WATCH_AUTONOMY_LEVELS', () => {
  it('is exactly the three levels of programme decision D15, in ascending order', () => {
    expect(WATCH_AUTONOMY_LEVELS).toEqual(['manual', 'assisted', 'supervised']);
  });

  it('starts at the most conservative level, which is the default for a new space', () => {
    expect(WATCH_AUTONOMY_LEVELS[0]).toBe('manual');
  });

  it('has no duplicate entries', () => {
    expect(new Set(WATCH_AUTONOMY_LEVELS).size).toBe(WATCH_AUTONOMY_LEVELS.length);
  });
});

/**
 * The thread / conversation route paths (epic kibana-z7xi). The `{param}` templates are what the
 * server registers; the `build*` helpers are the client-safe builders. They are pinned here
 * because the same strings are written a second time in the OpenAPI definitions under
 * `impl/schemas/conversations/`, and nothing else would notice the two drifting apart.
 */
describe('conversation and thread route paths', () => {
  it('roots the attachments template under the conversations collection', () => {
    expect(PND_CONVERSATION_ATTACHMENTS_URL_TEMPLATE).toBe(
      `${PND_CONVERSATIONS_URL}/{conversationId}/attachments`
    );
  });

  it('matches the OpenAPI path of the attachments route', () => {
    expect(PND_CONVERSATION_ATTACHMENTS_URL_TEMPLATE).toBe(
      '/internal/pnd/conversations/{conversationId}/attachments'
    );
  });

  // Rooted at /threads, not under /conversations: `_ensure` is addressed by
  // `(correlationId, gateId)` and *derives* the id it returns.
  it('matches the OpenAPI path of the thread _ensure route', () => {
    expect(PND_THREADS_ENSURE_URL).toBe('/internal/pnd/threads/_ensure');
  });

  it('matches the OpenAPI path of the detection-change emit route', () => {
    expect(constants.PND_DETECTION_CHANGE_SIGNAL_EMIT_URL).toBe(
      '/internal/pnd/signals/_detection_change'
    );
  });

  it('builds an attachments url', () => {
    expect(buildConversationAttachmentsUrl('8f3f960c-2972-5f32-be9e-742308bea5ce')).toBe(
      '/internal/pnd/conversations/8f3f960c-2972-5f32-be9e-742308bea5ce/attachments'
    );
  });

  // The builder is the only thing between a caller-supplied id and the path. `attachments` is a
  // trailing segment rather than the last one, so an unencoded `../../autonomy` would not merely
  // read a different conversation — it would address a different **route**.
  it('encodes a conversation id that would otherwise change the path', () => {
    expect(buildConversationAttachmentsUrl('../../autonomy')).toBe(
      '/internal/pnd/conversations/..%2F..%2Fautonomy/attachments'
    );
  });
});

/**
 * Register `#23` (ADR-016). `GET`, `DELETE` and `_rename` on a single conversation shipped in epic
 * kibana-z7xi and were retired in kibana-phf4.2 having never been called: a watch renames its own
 * thread through **Agent Builder's** `_rename`, and Agent Builder's `access: 'owner'` check means
 * ours would 404 for the analyst who can read a workflow-created thread anyway (D9).
 *
 * Asserted on the module namespace rather than by importing the names, because the point is that
 * they do not exist — an import of a removed export is a type error, which is a compile-time guard
 * for *this* file only. A constant is how a route path gets written twice, so keeping the names
 * spelled out here is what makes re-growing either route a deliberate act with a test to update.
 */
describe('retired single-conversation route paths', () => {
  it.each([
    'PND_CONVERSATION_URL_TEMPLATE',
    'PND_CONVERSATION_RENAME_URL_TEMPLATE',
    'buildConversationUrl',
    'buildConversationRenameUrl',
  ])('does not export `%s`', (name) => {
    expect(Object.keys(constants)).not.toContain(name);
  });

  it('leaves `attachments` the only conversation-addressed path', () => {
    expect(
      Object.entries(constants)
        .filter(([, value]) => typeof value === 'string' && value.includes('{conversationId}'))
        .map(([name]) => name)
    ).toEqual(['PND_CONVERSATION_ATTACHMENTS_URL_TEMPLATE']);
  });
});

/**
 * The two design-sync derivations (epic kibana-1fdi, plan §4.1 and §4.2). Pinned here for the same
 * reason the conversation paths are: the identical strings are written a second time in the
 * OpenAPI definitions under `impl/schemas/`, and nothing else would notice the two drifting apart.
 *
 * Neither route has a path parameter, so neither gets a `build*` helper. `discovery-context` is
 * addressed by a query array and `activity` takes no input at all, and the convention this file
 * already follows is that a query string belongs to the caller's fetch options rather than to the
 * path.
 */
describe('design-sync derivation route paths', () => {
  it('matches the OpenAPI path of the discovery-context route', () => {
    expect(PND_DISCOVERY_CONTEXT_URL).toBe('/internal/pnd/discovery-context');
  });

  it('matches the OpenAPI path of the proposals activity route', () => {
    expect(PND_PROPOSALS_ACTIVITY_URL).toBe('/internal/pnd/proposals/activity');
  });

  it('roots the activity series under the proposals collection', () => {
    expect(PND_PROPOSALS_ACTIVITY_URL).toBe(`${PND_PROPOSALS_URL}/activity`);
  });

  // `_auto_respond` and `_respond` are actions on the collection and carry the leading underscore the
  // repo reserves for them; `activity` and `history` are sub-resources and must not.
  it('names the activity series as a sub-resource rather than an action', () => {
    expect(PND_PROPOSALS_ACTIVITY_URL).not.toContain('/_');
  });
});

/**
 * The cap on `correlationIds` is pinned here because it is the **actual boundary**, the
 * way `PND_TUNABLE_RULE_FIELDS` is: `@kbn/openapi-generator` renders a bounded query array as
 * `ArrayFromString(...).max(n)`, and `ArrayFromString` returns a `z.preprocess` pipe with no
 * `.max`, so `maxItems` in the OpenAPI generates a codec that throws on every parse. The generated
 * codec therefore bounds each id and the route bounds the count — and nothing but this constant
 * keeps the route's number and the schema's documented number from drifting apart.
 */
describe('PND_DISCOVERY_CONTEXT_MAX_ALERT_IDS', () => {
  it('caps the ids one request may fan out into ES `ids` filter clauses', () => {
    expect(PND_DISCOVERY_CONTEXT_MAX_ALERT_IDS).toBe(200);
  });
});

/**
 * The candidate-rules route (register `#24`, workstream 5a). Its path is written a second time in
 * `impl/schemas/tuning/get_candidate_rules_route.schema.yaml`, so it is pinned here for the same
 * reason every other PND route path is. The three numbers are pinned because each is the **actual**
 * boundary rather than a documented one: `PND_TUNING_CANDIDATE_RULES_MAX` is simultaneously the
 * `terms` size of the aggregation, the count of scoped self-calls one request may make, and the
 * response's `maxItems`; the other two are enforced by `projectCandidateRule` because the generated
 * codec would reject an over-long value rather than degrade it.
 */
describe('tuning candidate-rules route', () => {
  it('matches the OpenAPI path of the candidate-rules route', () => {
    expect(PND_TUNING_CANDIDATE_RULES_URL).toBe('/internal/pnd/tuning/candidate-rules');
  });

  it('roots the candidate rules under the tuning collection', () => {
    expect(PND_TUNING_CANDIDATE_RULES_URL).toBe(`${PND_TUNING_URL}/candidate-rules`);
  });

  // A sub-resource, not an action: `_apply` carries the leading underscore the repo reserves for
  // those, and a read of the rules behind a discovery is not one.
  it('names the candidate rules as a sub-resource rather than an action', () => {
    expect(PND_TUNING_CANDIDATE_RULES_URL).not.toContain('/_');
  });

  // Both are rooted at `/tuning`, so nothing but distinct segments keeps
  // `/tuning/candidate-rules` from being routed as `/tuning/{proposalId}/_apply`.
  it('cannot be captured by the _apply route template', () => {
    expect(PND_TUNING_APPLY_URL_TEMPLATE).toBe('/internal/pnd/tuning/{proposalId}/_apply');
    expect(PND_TUNING_CANDIDATE_RULES_URL.split('/')).toHaveLength(
      PND_TUNING_APPLY_URL_TEMPLATE.split('/').length - 1
    );
  });

  it('caps the distinct rules one request may fan out into scoped self-calls', () => {
    expect(PND_TUNING_CANDIDATE_RULES_MAX).toBe(20);
  });

  it('bounds a projected `query` at the same length `PndTuningChange` bounds `note`', () => {
    expect(PND_CANDIDATE_RULE_MAX_QUERY_LENGTH).toBe(20000);
  });

  it('bounds a projected `index` list', () => {
    expect(PND_CANDIDATE_RULE_MAX_INDEX_PATTERNS).toBe(100);
  });
});
