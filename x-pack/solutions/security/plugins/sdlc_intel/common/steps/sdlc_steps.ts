/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { StepCategory } from '@kbn/workflows';
import { i18n } from '@kbn/i18n';

export const SetupIndicesStepTypeId = 'sdlc.setupIndices';
export const SeedReferenceDataStepTypeId = 'sdlc.seedReferenceData';
export const SeedWorkflowsExecutiveDemoStepTypeId = 'sdlc.seedWorkflowsExecutiveDemo';
export const SyncGithubProjectsStepTypeId = 'sdlc.syncGithubProjects';
export const ListGithubProjectsToSyncStepTypeId = 'sdlc.listGithubProjectsToSync';
export const SyncGithubOrgCatalogStepTypeId = 'sdlc.syncGithubOrgCatalog';
export const BuildRelationshipsStepTypeId = 'sdlc.buildRelationships';
export const BuildEpicPhasesStepTypeId = 'sdlc.buildEpicPhases';
export const SyncReleaseCalendarSlackStepTypeId = 'sdlc.syncReleaseCalendarSlack';
export const SyncReleaseCalendarSpreadsheetStepTypeId = 'sdlc.syncReleaseCalendarSpreadsheet';

const emptyInput = z.object({});
const countOutput = z.object({
  processed: z.number(),
  created: z.number().optional(),
  updated: z.number().optional(),
});

export const SetupIndicesInputSchema = emptyInput;
export const SetupIndicesOutputSchema = countOutput.extend({
  failed: z.array(z.string()).optional(),
});

export const SeedReferenceDataInputSchema = emptyInput;
export const SeedReferenceDataOutputSchema = countOutput;

export const SeedWorkflowsExecutiveDemoInputSchema = emptyInput;
export const SeedWorkflowsExecutiveDemoOutputSchema = countOutput;

export const SyncGithubProjectsInputSchema = z.object({
  orgLogin: z.string().default('elastic'),
  projectNumbers: z.array(z.number()).default([]),
  includeProjectNumbers: z.array(z.number()).optional(),
  excludeProjectNumbers: z.array(z.number()).optional(),
  titleIncludes: z.array(z.string()).optional(),
  titleExcludes: z.array(z.string()).optional(),
  githubConnectorId: z.string().optional(),
  githubToken: z.string().optional(),
  skipSyncedProjects: z.boolean().default(false),
  resumePartialSync: z.boolean().default(true),
  forceResyncProjectNumbers: z.array(z.number()).optional(),
});

export const SyncGithubProjectsOutputSchema = countOutput.extend({
  projectNumbers: z.array(z.number()),
  skipped: z.number(),
  skippedProjectNumbers: z.array(z.number()),
  resumedProjectNumbers: z.array(z.number()),
});

export const ListGithubProjectsToSyncInputSchema = SyncGithubProjectsInputSchema.pick({
  orgLogin: true,
  projectNumbers: true,
  includeProjectNumbers: true,
  excludeProjectNumbers: true,
  titleIncludes: true,
  titleExcludes: true,
  githubConnectorId: true,
  githubToken: true,
  skipSyncedProjects: true,
});

export const ListGithubProjectsToSyncOutputSchema = z.object({
  projectNumbers: z.array(z.number()),
  skippedProjectNumbers: z.array(z.number()),
});

export const SyncGithubOrgCatalogInputSchema = z.object({
  orgLogin: z.string().default('elastic'),
  githubConnectorId: z.string().optional(),
  githubToken: z.string().optional(),
});

export const SyncGithubOrgCatalogOutputSchema = countOutput.extend({
  failed: z.array(z.string()).optional(),
});

export const BuildEpicPhasesInputSchema = z.object({
  projectNumbers: z.array(z.number()).default([]),
});

export const BuildEpicPhasesOutputSchema = countOutput.extend({
  projectNumbers: z.array(z.number()),
});

export const BuildRelationshipsInputSchema = z.object({
  projectNumbers: z.array(z.number()).default([]),
  includeOrgCatalog: z.boolean().default(true),
});

export const BuildRelationshipsOutputSchema = countOutput.extend({
  projectNumbers: z.array(z.number()),
});

export const SyncReleaseCalendarSlackInputSchema = z.object({
  slackConnectorId: z.string(),
  channelName: z.string().default('kibana-mission-control'),
  lookbackHours: z.number().default(48),
});

export const SyncReleaseCalendarSpreadsheetInputSchema = z.object({
  googleDriveConnectorId: z.string(),
  spreadsheetId: z.string(),
  sheetGid: z.string(),
  sheetName: z.string().optional(),
});

export const SyncReleaseCalendarOutputSchema = countOutput;

const createDefinition = <TInput extends z.ZodTypeAny, TOutput extends z.ZodTypeAny>({
  id,
  label,
  description,
  inputSchema,
  outputSchema,
}: {
  id: string;
  label: string;
  description: string;
  inputSchema: TInput;
  outputSchema: TOutput;
}): CommonStepDefinition<TInput, TOutput> => ({
  id,
  category: StepCategory.Data,
  label,
  description,
  inputSchema,
  outputSchema,
});

export const setupIndicesStepCommonDefinition = createDefinition({
  id: SetupIndicesStepTypeId,
  label: i18n.translate('sdlcIntel.setupIndicesStep.label', {
    defaultMessage: 'Setup SDLC indices',
  }),
  description: i18n.translate('sdlcIntel.setupIndicesStep.description', {
    defaultMessage: 'Creates github-intel-* and sdlc-* Elasticsearch indices if missing.',
  }),
  inputSchema: SetupIndicesInputSchema,
  outputSchema: SetupIndicesOutputSchema,
});

export const seedReferenceDataStepCommonDefinition = createDefinition({
  id: SeedReferenceDataStepTypeId,
  label: i18n.translate('sdlcIntel.seedReferenceDataStep.label', {
    defaultMessage: 'Seed SDLC reference data',
  }),
  description: i18n.translate('sdlcIntel.seedReferenceDataStep.description', {
    defaultMessage: 'Seeds sdlc-team-dimension reference documents.',
  }),
  inputSchema: SeedReferenceDataInputSchema,
  outputSchema: SeedReferenceDataOutputSchema,
});

export const seedWorkflowsExecutiveDemoStepCommonDefinition = createDefinition({
  id: SeedWorkflowsExecutiveDemoStepTypeId,
  label: i18n.translate('sdlcIntel.seedWorkflowsExecutiveDemoStep.label', {
    defaultMessage: 'Seed Workflows executive demo',
  }),
  description: i18n.translate('sdlcIntel.seedWorkflowsExecutiveDemoStep.description', {
    defaultMessage:
      'Seeds sdlc-epic-phases demo documents for the Elastic Workflows executive roadmap (deck features, 9.3 release cycle).',
  }),
  inputSchema: SeedWorkflowsExecutiveDemoInputSchema,
  outputSchema: SeedWorkflowsExecutiveDemoOutputSchema,
});

export const syncGithubProjectsStepCommonDefinition = createDefinition({
  id: SyncGithubProjectsStepTypeId,
  label: i18n.translate('sdlcIntel.syncGithubProjectsStep.label', {
    defaultMessage: 'Sync GitHub Projects V2',
  }),
  description: i18n.translate('sdlcIntel.syncGithubProjectsStep.description', {
    defaultMessage:
      'Syncs GitHub org projects, views, and project items into github-intel-* indices. Leave projectNumbers empty to sync every org Project V2 board. Set skipSyncedProjects to resume after a partial run.',
  }),
  inputSchema: SyncGithubProjectsInputSchema,
  outputSchema: SyncGithubProjectsOutputSchema,
});

export const listGithubProjectsToSyncStepCommonDefinition = createDefinition({
  id: ListGithubProjectsToSyncStepTypeId,
  label: i18n.translate('sdlcIntel.listGithubProjectsToSyncStep.label', {
    defaultMessage: 'List GitHub projects to sync',
  }),
  description: i18n.translate('sdlcIntel.listGithubProjectsToSyncStep.description', {
    defaultMessage:
      'Resolves org Project V2 boards to sync, optionally omitting boards already marked completed in github-intel-sync-state.',
  }),
  inputSchema: ListGithubProjectsToSyncInputSchema,
  outputSchema: ListGithubProjectsToSyncOutputSchema,
});

export const syncGithubOrgCatalogStepCommonDefinition = createDefinition({
  id: SyncGithubOrgCatalogStepTypeId,
  label: i18n.translate('sdlcIntel.syncGithubOrgCatalogStep.label', {
    defaultMessage: 'Sync GitHub org catalog',
  }),
  description: i18n.translate('sdlcIntel.syncGithubOrgCatalogStep.description', {
    defaultMessage: 'Syncs GitHub org teams and repositories into github-intel-* indices.',
  }),
  inputSchema: SyncGithubOrgCatalogInputSchema,
  outputSchema: SyncGithubOrgCatalogOutputSchema,
});

export const buildEpicPhasesStepCommonDefinition = createDefinition({
  id: BuildEpicPhasesStepTypeId,
  label: i18n.translate('sdlcIntel.buildEpicPhasesStep.label', {
    defaultMessage: 'Build SDLC epic phases',
  }),
  description: i18n.translate('sdlcIntel.buildEpicPhasesStep.description', {
    defaultMessage:
      'Builds sdlc-epic-phases analytics documents from github-intel-* indices. Leave projectNumbers empty to process every synced project.',
  }),
  inputSchema: BuildEpicPhasesInputSchema,
  outputSchema: BuildEpicPhasesOutputSchema,
});

export const buildRelationshipsStepCommonDefinition = createDefinition({
  id: BuildRelationshipsStepTypeId,
  label: i18n.translate('sdlcIntel.buildRelationshipsStep.label', {
    defaultMessage: 'Build SDLC relationship graph',
  }),
  description: i18n.translate('sdlcIntel.buildRelationshipsStep.description', {
    defaultMessage:
      'Builds github-intel-relationships edges from project items and org team/repo catalog. Leave projectNumbers empty to process every synced project.',
  }),
  inputSchema: BuildRelationshipsInputSchema,
  outputSchema: BuildRelationshipsOutputSchema,
});

export const syncReleaseCalendarSlackStepCommonDefinition = createDefinition({
  id: SyncReleaseCalendarSlackStepTypeId,
  label: i18n.translate('sdlcIntel.syncReleaseCalendarSlackStep.label', {
    defaultMessage: 'Sync release calendar from Slack',
  }),
  description: i18n.translate('sdlcIntel.syncReleaseCalendarSlackStep.description', {
    defaultMessage:
      'Polls a Slack channel for Kibana Serverless release announcements and indexes normalized milestones into sdlc-release-calendar.',
  }),
  inputSchema: SyncReleaseCalendarSlackInputSchema,
  outputSchema: SyncReleaseCalendarOutputSchema,
});

export const syncReleaseCalendarSpreadsheetStepCommonDefinition = createDefinition({
  id: SyncReleaseCalendarSpreadsheetStepTypeId,
  label: i18n.translate('sdlcIntel.syncReleaseCalendarSpreadsheetStep.label', {
    defaultMessage: 'Sync release calendar from spreadsheet',
  }),
  description: i18n.translate('sdlcIntel.syncReleaseCalendarSpreadsheetStep.description', {
    defaultMessage:
      'Fetches the Elastic Stack release schedule Google Sheet and indexes milestone dates into sdlc-release-calendar.',
  }),
  inputSchema: SyncReleaseCalendarSpreadsheetInputSchema,
  outputSchema: SyncReleaseCalendarOutputSchema,
});
