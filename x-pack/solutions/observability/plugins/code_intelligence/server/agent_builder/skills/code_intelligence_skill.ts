/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

import { CODE_INTELLIGENCE_TOOL_IDS } from '../tools';

const {
  listRepositories,
  upsertRepository,
  startExtraction,
  getExtractionStatus,
  searchCatalog,
  getFinding,
  searchFindings,
  updateFindingStatus,
} = CODE_INTELLIGENCE_TOOL_IDS;

const description =
  'Use the code intelligence catalog: entries extracted from the source code of configured repositories that describe what a service logs or emits, including log lines, OpenTelemetry spans, metrics and attributes, each with a ready-to-run ES|QL query over logs, traces, and metrics. Use this skill when the user asks which repositories are in the catalog, what a service or repository logs or emits, which errors or spans a service produces, for a query that finds a specific log line, span, or metric, to run catalog queries, or when the user asks for adding a repository, editing a repository, or starting extraction of a repository. Also use for findings, sensitive data in logs or telemetry, investigating or reviewing a finding, and marking a finding verified or invalid.';

const content = `# Code Intelligence catalog

The catalog holds entries extracted from the source code of configured repositories. Each entry describes 1 log line, OpenTelemetry span, span attribute, or metric that the code emits, with a severity and a concrete ES|QL query over \`logs*\`, \`traces*\`, or \`metrics*\`.

## Answer questions about what a service logs or emits

1. Call \`${listRepositories}\` to find the exact \`owner/name\` identity of the repository the user means. Skip this when the user already gave the identity.
2. Call \`${searchCatalog}\` with \`repositories\`, and with \`signalTypes\`, \`severities\`, or \`q\` when the user narrows the question. Severities map to log levels: low is debug and info, medium is warn, high is error, critical is fatal.
3. Summarize the matching entries: title, severity, and the source file paths. Mention the total when there are more pages.

## Run a catalog query

- Run an entry's \`query\` with \`${platformCoreTools.executeEsql}\` when the user asks to run it or to check whether it happens in their data. Use the query as written; add a time filter only if the user asks for one.
- When an ES|QL attachment from the catalog is in the conversation, run that query the same way.

## Investigate a finding

1. When the conversation has an attachment whose description starts with 'Code Intelligence finding', read it with the attachments.read tool; it contains the finding id. Otherwise find the id with \`${searchFindings}\`.
2. Call \`${getFinding}\` for the full evidence.
3. Read the evidence excerpt and explain what value is written and where. When the finding is cataloged, check the related catalog entry's query using \`${searchCatalog}\`, and use \`${platformCoreTools.executeEsql}\` over \`logs*\`, \`traces*\`, or \`metrics*\` to look for the exposed field or message in the user's data. Add a time filter only if the user asks.
4. Report whether real sensitive data is exposed, the field or message, and the file path and line. Never repeat a secret value.
5. When the user agrees with the verdict, or asks you to decide, call \`${updateFindingStatus}\` with \`verified\` or \`invalid\` and a 1 to 2 sentence note explaining the reason without the secret value. The user confirms the update.

## List findings

Call \`${searchFindings}\`; it defaults to open findings. Summarize title, repository, path:line, and status.

## Add a repository and start extraction

Only do this when the user explicitly asks.

1. Call \`${upsertRepository}\` with the \`owner/name\` identity and a credential-free \`https://\` clone URL. The user confirms the save.
2. Call \`${startExtraction}\` with only the repositories the user named. Never extract every repository. The user confirms the start.
3. Report the returned batch id. Extraction takes several minutes. When the user asks for progress, call \`${getExtractionStatus}\` with the batch id.
4. New entries become searchable about 1 second after a repository completes.

If \`${startExtraction}\` returns \`extraction_already_running\`, tell the user another batch is running and give its id when the error includes \`extractionId\`. If it returns \`repository_not_configured\`, offer to add the repository first.

Deleting a repository is not available from chat; the user does that in the Code Intelligence app.
`;

export const CODE_INTELLIGENCE_SKILL_TOOL_IDS: readonly string[] = [
  listRepositories,
  upsertRepository,
  startExtraction,
  getExtractionStatus,
  searchCatalog,
  getFinding,
  searchFindings,
  updateFindingStatus,
  platformCoreTools.executeEsql,
];

export const createCodeIntelligenceSkill = () =>
  defineSkillType({
    id: 'observability.code-intelligence',
    name: 'code-intelligence',
    basePath: 'skills/observability',
    description,
    content,
    getRegistryTools: () => [...CODE_INTELLIGENCE_SKILL_TOOL_IDS],
  });
