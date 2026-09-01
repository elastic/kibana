/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { SECURITY_BUILD_REDIRECT_URL_TOOL_ID } from '../../tools';

/**
 * The verdicts this skill may return. Single source of truth: the skill content, the
 * Detection Coverage worker's `ai.agent` output schema, and its verdict switch must all
 * agree on this list, and a drift test asserts it. Adding a verdict without a matching
 * switch case would silently route that gap to the worker's report-only arm.
 */
export const DETECTION_COVERAGE_VERDICTS = [
  'covered_enabled',
  'covered_disabled',
  'prebuilt_available',
  'no_coverage',
] as const;

/**
 * A thin orchestrator. It owns one intent: "I need detection for a behavior". It decides the
 * route and hands off. It brings no search tools of its own: it loads `find-security-rules`
 * and `recommend-prebuilt-rules` at runtime and follows their search instructions, so the
 * search logic has exactly one source and this skill cannot drift from it.
 */
const DETECTION_COVERAGE_CONTENT = `# Detection Coverage Check

## Use This Skill

A problem arrives: a behavior is not covered, a hunt found something undetected, or a workflow reports a gap. Creating a rule is a second operation, and often the wrong one. This skill is the first operation: it decides which action actually closes the problem. Creation is only one of four answers.

Use this skill when the user or a workflow wants coverage to exist and gives no rule logic. Examples: "I want a rule that covers X" with no query given, "we need to detect X", "we have no coverage for X, what do I do?", or a hunt report that names an uncovered behavior.

The intent is to make coverage, not to ask about it. A question about existing coverage ("do we have a rule for X?", "do we detect X?", "which tactics am I missing?") is a reporting intent and belongs to another skill (see Boundaries). If the user first asks such a question and then wants the gap closed, this skill enters on that second message.

The skill answers one question: is this behavior already covered, and if not, what is the cheapest way to cover it? Enabling or installing an existing rule is far cheaper than writing a new one. And sometimes no rule action is right at all: when the needed data source does not exist, say so and stop.

## Intent Gate

Run this gate first. It decides whether the check applies at all.

The dividing line: did the user give the detection logic, or only the outcome they want?

**Skip this skill and use \`detection-rule-edit\` directly** when the request carries the rule's substance. Any one of these is enough:

- A query is supplied (ES|QL, KQL, EQL), even a rough one.
- Explicit field and value conditions, such as "when \`process.name\` is \`mimikatz.exe\`".
- Concrete rule parameters: index pattern, severity, risk score, interval, rule type.
- The user asks for a **new** or **another** rule, which means they already know it does not exist.
- A rule attachment is in the conversation and the user is iterating on it.

Do not run a search then. Do not ask whether it is already covered. The user has decided.

**Run the check** when the request names an outcome with no logic attached: a gap statement, a technique id alone, a behavior description, or a hunt finding.

If the request has an imperative verb but no logic ("create a rule for credential dumping"), run the check, keep it short, and lead with the answer. If nothing matches, hand off to \`detection-rule-edit\` in the same turn. Never make the user ask twice.

Automated callers, such as a workflow step, always run the full check. There is no user in the loop who has decided anything.

## Boundaries

- Coverage and existence questions ("do we have a rule for X?", "do we detect X?", "show me", "how many") -> \`find-security-rules\`. Answering a question does not close a gap.
- Deployment-wide coverage ("which MITRE tactics am I missing?", "what should I install?") -> \`recommend-prebuilt-rules\`. It has a dedicated installed-coverage tool. Do not rebuild that answer here.
- Writing or editing the rule itself -> \`detection-rule-edit\`.
- Tuning a noisy rule -> \`rule-tuning\`.

## Role

This skill decides. It never acts. It has no search tools of its own and no mutation tools. Other skills and the user perform the actions.

## How to Search

Load the sibling skills and follow their search instructions. Do it in this order and stop at the first exact match.

### Step 1: installed rules

Call \`load_skill\` with \`find-security-rules\`. Follow that skill's instructions to search installed rules. Two constraints from this skill on top of its instructions:

- Do not pass \`enabled\`. You need enabled and disabled rules in one result.
- Up to three searches: one by technique id if you have one, one by the distinctive behavior words, and, when both return nothing, one with the **single most distinctive word** (a protocol, product, or tool word: "SMB", "DNS", "kubectl"). Free text is word-AND matched, so extra intent words like "attackers" or "exfiltrating" hide real matches. The single-word probe is what finds a rule whose description says it differently.

Judge each returned rule with the Match Rubric. An exact match that is enabled means \`covered_enabled\`. Stop. An exact match that is disabled means \`covered_disabled\`. Stop. A close but insufficient rule is not coverage: note it for the final explanation and continue.

### Step 2: installable prebuilt rules

Only when step 1 found no exact match. Call \`load_skill\` with \`recommend-prebuilt-rules\`. Follow its search instructions. Request the \`description\`, \`query\`, and \`threat\` fields, because you must judge the behavior and the technique, not the name. One search, two at most.

An exact match means \`prebuilt_available\`, with one guard first: if the single-word probe from step 1 never ran, run it now against installed rules. An installed rule always beats installing a copy of it. Only when that probe also finds nothing, return \`prebuilt_available\`. Stop. Otherwise return \`no_coverage\`, naming any close rule you noted in step 1.

### Precedence

The loaded skills provide search procedure only. Two of their rules do not apply to this task:

- They say they are read-only and must never suggest enabling or installing a rule. That restriction is theirs, not yours. Your whole purpose is to recommend the cheapest route, including enabling or installing.
- Their rendering rules (tables, filter sentences, install recommendations) apply to their own tasks. Your answer follows this skill: one verdict, one rule, one route.

## Match Rubric

A rule is an **exact** match when both hold:

1. It targets the same **behavior**, not just the same tactic or technique. One technique covers many distinct behaviors. \`T1059\` includes PowerShell encoded commands, \`cmd.exe\` spawned by Office, and Python one-liners. A rule for one of them does not cover the others.
2. Its **data source** is the same. A Windows process rule does not cover a Linux behavior, and an Okta rule does not cover Azure AD.

Everything else is **no match**, including a rule that covers the same behavior but is scoped too narrowly, or one that would cover the gap only after a query change. A shared MITRE technique on its own is never enough. Say "no match" rather than stretching a weak one: a false "already covered" leaves a real gap open. When such a close rule exists, name it in the explanation so the analyst can decide to widen it instead, but the verdict stays \`no_coverage\`.

## Verdicts and Routes

Report exactly one verdict. Each verdict has one route and one owner. You decide the route. You never perform the action.

| Verdict | Meaning | Route | Who acts |
|---|---|---|---|
| \`covered_enabled\` | An installed, enabled rule already detects this | none | nobody, you are done |
| \`covered_disabled\` | An installed rule detects this but is turned off | enable | the user, in the rule page |
| \`prebuilt_available\` | An Elastic prebuilt rule detects this and is not installed | install | the user, in the Add Elastic Rules page |
| \`no_coverage\` | Nothing matches | create | the \`detection-rule-edit\` skill |

Always carry the supporting rule with the verdict: its name, its \`id\` (installed rules) or \`rule_id\` (prebuilt rules), and one sentence saying why it matches or why nothing does. \`no_coverage\` carries no rule.

## After the Verdict

Open every answer with the verdict line, exactly this shape and nothing before it:

**\`<verdict>\`** — <one sentence in plain words>

Write the verdict token literally, spelled as in the table, inside backticks. Write exactly one: a second token makes the answer unusable for anyone acting on it. Callers, including automated ones, read that first line to decide what happens next, so an answer that only *describes* the situation without naming its verdict cannot be acted on.

Then the rule, then the route. Then execute the route:

- **\`covered_enabled\`**: name the rule and stop.
- **\`covered_disabled\`**: no chat tool can enable a rule. Call \`security.build_redirect_url\` with \`path: "/app/security/rules/id/<the rule's id>"\` and present the link. The enable switch is at the top of that page. Never claim you enabled anything.
- **\`prebuilt_available\`**: show the evidence so the user can judge the fit: for each candidate (three at most) give the name, one line from its description, and its related integrations. Note when the user does not seem to collect the data the rule needs. Then call \`security.build_redirect_url\` with \`path: "/app/security/rules/add_rules"\` and present the link, with the exact rule name to search for there. The final call is the user's. Never claim you installed anything.
- **\`no_coverage\`**: say what you searched, name a close rule when one exists and why it does not cover the gap, then offer: "I can draft a new rule for this." On yes, \`detection-rule-edit\` takes over.

Offer, then wait. Do not start a create until the user agrees.

## Grounding

Every rule name and id you report must come from a tool result in this conversation. Never recall a rule from memory or invent a \`rule_id\`.

If both searches return zero rules, say so plainly and return \`no_coverage\`. Zero results is a valid, useful answer.

State which filters you used. A wrong filter looks the same as a real gap, and only the user can tell the two apart.

Know one limit: free-text search matches exact words in rule names and descriptions. A rule described with different words for the same behavior can be missed. When step 1 finds nothing, say this in one sentence.

## Structured Output

When the caller asks for structured output, fill every field of the requested schema from tool results. Put the verdict in \`verdict\`, the supporting rule in \`rule_id\` and \`rule_name\`, and the one-sentence justification in \`rationale\`. When the schema has a \`prebuilt_version\` field, fill it from the matched prebuilt rule (its \`version\` in the tool result) for \`prebuilt_available\`, and set 0 for every other verdict. Leave \`rule_id\` and \`rule_name\` empty for \`no_coverage\`. In structured-output mode, skip the redirect link and the offers. The calling workflow owns the actions and gates them with its own approval steps.`;

export const createDetectionCoverageSkill = (): SkillDefinition<
  'detection-coverage',
  'skills/security/rules'
> =>
  defineSkillType({
    id: 'detection-coverage',
    name: 'detection-coverage',
    basePath: 'skills/security/rules',
    description:
      'Make a behavior covered by detection. Use when the user wants coverage to exist ' +
      '("I want a rule that covers X", "we need to detect X", a reported gap) and gives no ' +
      'rule logic. Checks installed rules (enabled and disabled) and the installable prebuilt ' +
      'catalog, then routes to one action: nothing, enable, install, or create. ' +
      'NOT for questions about existing coverage ("do we have a rule for X?", "which ' +
      'tactics am I missing?") — those are reporting intents for find-security-rules or ' +
      'recommend-prebuilt-rules. Decides only; never mutates.',
    content: DETECTION_COVERAGE_CONTENT,
    getRegistryTools: () => [SECURITY_BUILD_REDIRECT_URL_TOOL_ID],
  });
