/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import {
  ALERTZERO_ACTIONS_LIST_TOOL_ID,
  ALERTZERO_PROPOSALS_REVISE_TOOL_ID,
} from '@kbn/alertzero-common';

export const createProposalManagementSkill = (
  canManage: (request: KibanaRequest) => Promise<boolean>
): SkillDefinition =>
  defineSkillType({
    id: 'alertzero-proposal-management',
    name: 'alertzero-proposal-management',
    basePath: 'skills/security/alerts',
    availability: {
      cacheMode: 'none',
      handler: async ({ request }) =>
        (await canManage(request))
          ? { status: 'available' }
          : { status: 'unavailable', reason: 'Requires permission to manage proposals.' },
    },
    description:
      'Read and revise AlertZero investigation proposals when an analyst asks to change a proposed action, its parameters, rationale, impact, or confidence. Use for requests such as "change the index pattern in this proposal" or "revise the proposed rule". Also discovers available AlertZero actions. Edits a pending proposal for human review; does not edit deployed rules, approve, dismiss, or execute actions.',
    getRegistryTools: () => [ALERTZERO_PROPOSALS_REVISE_TOOL_ID, ALERTZERO_ACTIONS_LIST_TOOL_ID],
    content: `# AlertZero proposal management

## Understand the revision chain

A proposal is a complete recommendation awaiting a human decision, not a change log.
Revising creates a NEW pending proposal. The predecessor becomes superseded, not
dismissed: dismissal is a human decision, whereas superseding preserves revision history.
The successor keeps rootProposalId, increments revision by one, and has supersedes
pointing to the predecessor. The predecessor's supersededBy points to the successor.
The server owns these identity, state, and link fields; do not construct or write them.
The approval gate and deadline belong to the chain: revision neither approves an action
nor restarts the deadline. A retry after a failed action is a different operation and
does not increment revision; never initiate a retry through this skill.

## Read before editing

1. If needed, locate the card with attachments.list, then pass its attachment_id
   to attachments.read. In the read result, find \`Proposal ID: <id>\` (the same value as
   \`Proposal data.id\`). This is the proposal's own ID; attachment_id identifies the
   conversation card and is only for attachment tools.
2. Inspect status, decision, expired, rootProposalId, revision, supersedes, and
   supersededBy. Missing optional history fields on older records are not values
   to invent. If supersededBy is present, locate and read that proposal's attachment
   and repeat until you reach the current revision. Do not base edits on an older
   revision merely because the tool can resolve its ID to the latest one.
3. Revise only a pending, undecided, unexpired proposal at the analyst's request.
   Before calling the revision tool, obtain the \`Proposal ID: <id>\` from the current
   revision's read result into its \`proposalId\` argument and check the values match
   exactly. If that line or the current attachment is unavailable, stop and
   explain the missing context. Never guess its contents or recover it by
   querying internal storage.

## Build a complete successor

- Start from the current comment and actionInput. Apply only the requested changes.
- comment is a COMPLETE REPLACEMENT Markdown document. Preserve the title,
  investigation rationale, structure, safety warnings, and unchanged details.
  Pass the entire updated document, not "Revised proposal to change X to Y".
  Omit comment only if the existing document remains accurate.
- Keep comment edits minimal and localized: the analyst sees every revision,
  including superseded cards, together in chat and should recognize the same
  proposal with only the requested tuning. Copy unaffected text verbatim, keeping
  Markdown heading levels, emphasis, paragraph order, lists, and table layout.
  Do not enlarge or restyle the title, rephrase unchanged passages, or add sections
  such as "Rationale" or "Safety notes" unless the analyst explicitly requests them.
  Preserve existing rationale and warnings in their original places; these are
  content to retain, not instructions to introduce new headings or expand them.
- Send the complete updated actionInput when changing parameters, preserving all
  unchanged fields. The API shallow-merges top-level keys: nested objects and arrays
  replace their prior values, and omitted keys are retained. Omitting a key does not
  delete it. Do not invent parameters or send unsupported deletion values.
- Update any matching prose and table entries so comment and actionInput agree.
- Keep actionWorkflowId unchanged: a different action is not a revision.
- Use security.alertzero.actions.list only when action discovery is needed.
- Call security.alertzero.proposals.revise with the verified proposalId and edits.
  On a conflict or stale context, reread the current revision before proposing edits
  again; do not blindly repeat a write whose outcome is uncertain.

### Example: change logs-* to logs*

If the existing proposal explains a detection gap, warns that the rule is created
disabled, and includes an Index table row, preserve all that content. Change the
Index row to logs* and actionInput.index to ["logs*"]. Keep name, description,
query, severity, risk_score, and all other unchanged input fields. The new comment
must still explain the full proposed rule and retain the disabled-rule warning.
For this request, change only the index value wherever it appears in the comment;
keep all other Markdown exactly as written, including a bold title rather than
turning it into a heading. Put any explanation of the edit in the chat response.

## Verify and respond

Agent Builder automatically renders the successor attachment. Summarize the changes
separately in chat and explain that the new revision awaits a human decision.
To inspect a proposal in the conversation, use attachments.list, then attachments.read
with a listed attachment_id. Match the proposal data's id to the returned proposalId.
If the successor is available, verify its comment, actionInput, and revision links.
If it is absent from the tool's list, base the response on the successful revision
result and distinguish that success from attachment verification being unavailable
in this turn.
Never approve, dismiss, execute, or directly update proposal attachments or storage.
`,
  });
