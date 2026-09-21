/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * This extraction schema and prompts are an intentional duplicate of the E3 counterpart
 * at `security_solution/server/threat_intel/`. No cross-plugin import is allowed
 * (buildout.md:31). Unification into a shared package is a post-demo follow-up.
 */

import { z } from '@kbn/zod/v4';

const candidateBehaviorSchema = z.object({
  technique_id: z
    .string()
    .describe(
      'Canonical ATT&CK ID (e.g. "T1566.001", "T1059.003"). Use sub-technique IDs ' +
        'when the text describes a specific variant.'
    ),
  evidence_quote: z
    .string()
    .describe('Verbatim 1-3 sentence quote from the text that justifies the mapping.'),
  llm_confidence: z.number().min(0).max(1).describe('0.0-1.0 confidence in this mapping.'),
});

export const huntBehaviorLlmExtractionSchema = z.object({
  candidates: z.array(candidateBehaviorSchema).default([]),
});

const esqlRuleSchema = z.object({
  technique_id: z
    .string()
    .describe('ATT&CK ID of the candidate behavior this query hunts for — copy it verbatim.'),
  esql: z
    .string()
    .describe(
      'Complete executable ES|QL query starting with FROM. No markdown fences, no comment lines.'
    ),
});

export const huntBehaviorEsqlGenerationSchema = z.object({
  rules: z.array(esqlRuleSchema).default([]),
});

export const EXTRACTION_PROMPT = `You are a threat intelligence analyst. Extract MITRE ATT&CK technique
IDs that are *actively described* in the provided report text. Do NOT include techniques merely
mentioned in passing or as background context.

For each candidate technique, return:
- technique_id: the canonical ATT&CK ID
- evidence_quote: a verbatim 1-3 sentence quote from the text justifying the mapping
- llm_confidence: 0.0-1.0 estimate of confidence`;

export const CONTEXT_PREAMBLE = `When environment context is provided, prefer techniques that BOTH the
report text describes AND the observed entities (hosts, users, sample events) plausibly exhibit.
Use the context to refine technique IDs (e.g. choose a specific sub-technique that matches an
observed process/command pattern) — do NOT invent IDs that aren't in the report text just because
the environment is noisy.

When a "Proposed atomic rules" block is present, the listed IOCs are ALREADY covered by atomic
ES|QL detections the orchestrator will surface to the analyst. Your job is to add value beyond
that coverage: propose behaviors that catch the same activity through *patterns* (process trees,
command-line signatures, parent/child relationships, event sequences) rather than echoing the
atomic IOC match. If a candidate technique would only fire on the exact IOC values already
listed, drop it — it's not a corroboration signal, it's a duplicate.`;

export const ESQL_GENERATION_PROMPT = `You are an expert detection engineer writing ES|QL threat-hunt
queries for the Elastic Security Detection Engine.

For EACH candidate behavior listed below, write ONE complete ES|QL query that hunts for the
SPECIFIC activity the threat report describes, grounded in the report's concrete artifacts:
IP addresses, CIDR ranges, domains, URLs, file hashes, file paths, package/library names,
process names, command lines, and email/user accounts. Use the verbatim artifact values from
the "Extracted IOCs" list and the report text.

Hard requirements:
- Each query MUST filter on at least one concrete artifact value (or a tight pattern derived
  from one, e.g. a package name with a version wildcard). Generic queries are worthless.
- NEVER filter on the ATT&CK technique name as a message substring
  (e.g. \`TO_LOWER(message) LIKE "*credentials in files*"\` is forbidden).
- Start with \`FROM <patterns>\` using the most relevant of the available index patterns —
  prefer the specific integration(s) where the activity would appear over a catch-all.
  Always use wildcard index patterns (e.g. \`logs-okta.system*\`); NEVER a dated concrete
  index name — confirmed-hit indices only tell you WHICH integration to target.
- Use only valid ES|QL: commands FROM / WHERE / EVAL / STATS ... BY / SORT / KEEP / LIMIT
  separated by \`|\`; functions such as TO_LOWER(), STARTS_WITH(), ENDS_WITH(),
  CIDR_MATCH(<ip_field>, "<cidr>"), COALESCE(); operators ==, !=, IN (...), LIKE with *
  wildcards, AND / OR / NOT, IS NOT NULL. String literals use double quotes.
- Use ECS fields appropriate to the artifact and data source:
  ip → source.ip / destination.ip / host.ip / client.ip / server.ip / related.ip;
  domain → dns.question.name / destination.domain / url.domain;
  url → url.full / url.original;
  hash → file.hash.sha256|sha1|md5 / process.hash.* / dll.hash.*;
  email or account → user.name / user.email / user.target.name / related.user;
  file path → file.path / process.executable;
  process / command → process.name / process.command_line / process.args;
  cloud API activity → event.action / event.provider / user.name / source.ip;
  packages & network flows → url.* / destination.domain / network.* / event.action.
- Correlate more than one signal when the report supports it (e.g. process activity AND a
  known C2 destination) — but never at the cost of requirement 1.
- End with \`| LIMIT 100\`. Include a KEEP listing @timestamp plus the fields the query
  filters on so the preview surface shows the evidence. In KEEP, only use fields you
  filtered on, core ECS fields (@timestamp, host.name, user.name, source.ip,
  destination.ip, event.action, event.outcome), or fields observed in the sample
  events — an invented column makes the whole query fail validation.
- Return the bare query text only — no markdown, no comments, no prose.`;
