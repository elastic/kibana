/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

import {
  createServerStepDefinition,
  type StepHandlerContext,
} from '@kbn/workflows-extensions/server';
import {
  buildEpicPhasesStepCommonDefinition,
  buildRelationshipsStepCommonDefinition,
  listGithubProjectsToSyncStepCommonDefinition,
  seedReferenceDataStepCommonDefinition,
  seedWorkflowsExecutiveDemoStepCommonDefinition,
  setupIndicesStepCommonDefinition,
  syncGithubOrgCatalogStepCommonDefinition,
  syncGithubProjectsStepCommonDefinition,
  syncReleaseCalendarSlackStepCommonDefinition,
  syncReleaseCalendarSpreadsheetStepCommonDefinition,
} from '../../common/steps/sdlc_steps';
import {
  syncReleaseCalendarFromSlack,
  syncReleaseCalendarFromSpreadsheet,
} from '../services/release_calendar_service';
import {
  buildEpicPhases,
  buildRelationships,
  listGithubProjectsToSync,
  seedSdlcReferenceData,
  seedSdlcWorkflowsExecutiveDemo,
  setupSdlcIndices,
  syncGithubOrgCatalog,
  syncGithubProjects,
} from '../services/sdlc_data_layer_service';
import { resolveGithubToken } from '../services/resolve_github_token';

const resolveRunId = (context: StepHandlerContext): string =>
  context.contextManager.getContext().execution.id;

const resolveGithubTokenForStep = async (
  context: StepHandlerContext,
  {
    githubConnectorId,
    githubToken,
  }: {
    githubConnectorId?: string;
    githubToken?: string;
  }
): Promise<string> =>
  resolveGithubToken({
    request: context.contextManager.getFakeRequest(),
    githubConnectorId,
    githubToken,
  });

export const setupIndicesStepDefinition = createServerStepDefinition({
  ...setupIndicesStepCommonDefinition,
  handler: async (context) => {
    try {
      const esClient = context.contextManager.getScopedEsClient();
      const output = await setupSdlcIndices(esClient);
      if (output.failed.length) {
        return {
          error: new Error(`Failed to create indices: ${output.failed.join('; ')}`),
        };
      }
      return { output };
    } catch (error) {
      return {
        error: new Error(error instanceof Error ? error.message : 'Failed to setup SDLC indices'),
      };
    }
  },
});

export const seedReferenceDataStepDefinition = createServerStepDefinition({
  ...seedReferenceDataStepCommonDefinition,
  handler: async (context) => {
    try {
      const esClient = context.contextManager.getScopedEsClient();
      const output = await seedSdlcReferenceData(esClient);
      return { output };
    } catch (error) {
      return {
        error: new Error(
          error instanceof Error ? error.message : 'Failed to seed SDLC reference data'
        ),
      };
    }
  },
});

export const seedWorkflowsExecutiveDemoStepDefinition = createServerStepDefinition({
  ...seedWorkflowsExecutiveDemoStepCommonDefinition,
  handler: async (context) => {
    try {
      const esClient = context.contextManager.getScopedEsClient();
      const output = await seedSdlcWorkflowsExecutiveDemo(esClient);
      return { output };
    } catch (error) {
      return {
        error: new Error(
          error instanceof Error ? error.message : 'Failed to seed Workflows executive demo data'
        ),
      };
    }
  },
});

export const syncGithubProjectsStepDefinition = createServerStepDefinition({
  ...syncGithubProjectsStepCommonDefinition,
  handler: async (context) => {
    try {
      const {
        orgLogin,
        projectNumbers,
        includeProjectNumbers,
        excludeProjectNumbers,
        titleIncludes,
        titleExcludes,
        githubConnectorId,
        githubToken,
        skipSyncedProjects,
        resumePartialSync,
        forceResyncProjectNumbers,
      } = context.input;
      const esClient = context.contextManager.getScopedEsClient();
      const output = await syncGithubProjects({
        esClient,
        orgLogin,
        projectNumbers,
        filters: {
          includeProjectNumbers,
          excludeProjectNumbers,
          titleIncludes,
          titleExcludes,
        },
        githubToken: await resolveGithubTokenForStep(context, { githubConnectorId, githubToken }),
        runId: resolveRunId(context),
        skipSyncedProjects,
        resumePartialSync,
        forceResyncProjectNumbers,
      });
      return { output };
    } catch (error) {
      return {
        error: new Error(
          error instanceof Error ? error.message : 'Failed to sync GitHub projects'
        ),
      };
    }
  },
});

export const listGithubProjectsToSyncStepDefinition = createServerStepDefinition({
  ...listGithubProjectsToSyncStepCommonDefinition,
  handler: async (context) => {
    try {
      const {
        orgLogin,
        projectNumbers,
        includeProjectNumbers,
        excludeProjectNumbers,
        titleIncludes,
        titleExcludes,
        githubConnectorId,
        githubToken,
        skipSyncedProjects,
      } = context.input;
      const esClient = context.contextManager.getScopedEsClient();
      const output = await listGithubProjectsToSync({
        esClient,
        orgLogin,
        projectNumbers,
        filters: {
          includeProjectNumbers,
          excludeProjectNumbers,
          titleIncludes,
          titleExcludes,
        },
        githubToken: await resolveGithubTokenForStep(context, { githubConnectorId, githubToken }),
        skipSyncedProjects,
      });
      return { output };
    } catch (error) {
      return {
        error: new Error(
          error instanceof Error ? error.message : 'Failed to list GitHub projects to sync'
        ),
      };
    }
  },
});

export const syncGithubOrgCatalogStepDefinition = createServerStepDefinition({
  ...syncGithubOrgCatalogStepCommonDefinition,
  handler: async (context) => {
    try {
      const { orgLogin, githubConnectorId, githubToken } = context.input;
      const esClient = context.contextManager.getScopedEsClient();
      const output = await syncGithubOrgCatalog({
        esClient,
        orgLogin,
        githubToken: await resolveGithubTokenForStep(context, { githubConnectorId, githubToken }),
        runId: resolveRunId(context),
      });
      return { output };
    } catch (error) {
      return {
        error: new Error(
          error instanceof Error ? error.message : 'Failed to sync GitHub org catalog'
        ),
      };
    }
  },
});

export const buildEpicPhasesStepDefinition = createServerStepDefinition({
  ...buildEpicPhasesStepCommonDefinition,
  handler: async (context) => {
    try {
      const { projectNumbers } = context.input;
      const esClient = context.contextManager.getScopedEsClient();
      const output = await buildEpicPhases({
        esClient,
        projectNumbers,
        runId: resolveRunId(context),
      });
      return { output };
    } catch (error) {
      return {
        error: new Error(
          error instanceof Error ? error.message : 'Failed to build SDLC epic phases'
        ),
      };
    }
  },
});

export const buildRelationshipsStepDefinition = createServerStepDefinition({
  ...buildRelationshipsStepCommonDefinition,
  handler: async (context) => {
    try {
      const { projectNumbers, includeOrgCatalog } = context.input;
      const esClient = context.contextManager.getScopedEsClient();
      const output = await buildRelationships({
        esClient,
        projectNumbers,
        includeOrgCatalog,
        runId: resolveRunId(context),
      });
      return { output };
    } catch (error) {
      return {
        error: new Error(
          error instanceof Error ? error.message : 'Failed to build SDLC relationship graph'
        ),
      };
    }
  },
});

export const syncReleaseCalendarSlackStepDefinition = createServerStepDefinition({
  ...syncReleaseCalendarSlackStepCommonDefinition,
  handler: async (context) => {
    try {
      const { slackConnectorId, channelName, lookbackHours } = context.input;
      const esClient = context.contextManager.getScopedEsClient();
      const output = await syncReleaseCalendarFromSlack({
        esClient,
        request: context.contextManager.getFakeRequest(),
        runId: resolveRunId(context),
        slackConnectorId,
        channelName,
        lookbackHours,
      });
      return { output };
    } catch (error) {
      return {
        error: new Error(
          error instanceof Error ? error.message : 'Failed to sync release calendar from Slack'
        ),
      };
    }
  },
});

export const syncReleaseCalendarSpreadsheetStepDefinition = createServerStepDefinition({
  ...syncReleaseCalendarSpreadsheetStepCommonDefinition,
  handler: async (context) => {
    try {
      const { googleDriveConnectorId, spreadsheetId, sheetGid, sheetName } = context.input;
      const esClient = context.contextManager.getScopedEsClient();
      const output = await syncReleaseCalendarFromSpreadsheet({
        esClient,
        request: context.contextManager.getFakeRequest(),
        runId: resolveRunId(context),
        googleDriveConnectorId,
        spreadsheetId,
        sheetGid,
        sheetName,
      });
      return { output };
    } catch (error) {
      return {
        error: new Error(
          error instanceof Error
            ? error.message
            : 'Failed to sync release calendar from spreadsheet'
        ),
      };
    }
  },
});
