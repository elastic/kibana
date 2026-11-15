/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, KibanaRequest, Logger } from '@kbn/core/server';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';
import type { StartPlugins } from '../plugin';

/**
 * Defaults for the explorer install route, so a caller can enable the explorer with only a mode.
 * Each resolver reuses what the space already has before creating anything.
 */

// Both sentinels mean "no default": the GenAI settings page writes the first, the
// inference endpoints settings page the second.
const NO_DEFAULT_SENTINELS: readonly string[] = ['NO_DEFAULT_CONNECTOR', 'NO_DEFAULT_MODEL'];

export const AESOP_DEFAULT_DATASET_NAME = 'aesop-explorer-default';
export const AESOP_DECISION_LOG_TITLE = 'AESOP Decision Log';
const DECISION_LOG_PAGE_SIZE = 50;
const DECISION_LOG_MAX_PAGES = 10;

const EVALS_READ_PRIVILEGE = 'read_evals';
const EVALS_MANAGE_PRIVILEGE = 'manage_evals';

export class AesopExplorerDefaultError extends Error {
  constructor(message: string, public readonly statusCode: 400 | 403) {
    super(message);
    this.name = 'AesopExplorerDefaultError';
  }
}

interface DefaultsDeps {
  pluginsStart: StartPlugins;
  request: KibanaRequest;
  spaceId: string;
  logger: Logger;
}

/** The `genAi:defaultAIConnector` setting first, then the inference plugin's own default. */
export const resolveDefaultConnectorId = async ({
  pluginsStart,
  request,
  logger,
  uiSettingsClient,
}: DefaultsDeps & { uiSettingsClient: IUiSettingsClient }): Promise<string> => {
  try {
    const setting = await uiSettingsClient.get<string>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR);
    if (setting && !NO_DEFAULT_SENTINELS.includes(setting)) {
      return setting;
    }
  } catch (error) {
    logger.warn(`Reading ${GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR} failed`, { error });
  }

  const connector = await pluginsStart.inference
    .getDefaultConnector(request)
    .catch(() => undefined);
  if (!connector?.connectorId) {
    throw new AesopExplorerDefaultError(
      'No default AI connector is configured in this space; pass connector_id',
      400
    );
  }
  return connector.connectorId;
};

// The evals dataset service writes as the internal user, so the caller's own
// evals privilege is checked here before reading or creating through it.
const hasEvalsPrivilege = async (
  { pluginsStart, request, spaceId }: DefaultsDeps,
  privilege: string
): Promise<boolean> => {
  const { security } = pluginsStart;
  const { hasAllRequested } = await security.authz
    .checkPrivilegesWithRequest(request)
    .atSpace(spaceId, { kibana: [security.authz.actions.api.get(privilege)] });
  return hasAllRequested;
};

/** The space's `aesop-explorer-default` dataset, created empty when missing. */
export const resolveDefaultDatasetId = async (deps: DefaultsDeps): Promise<string> => {
  const datasetService = deps.pluginsStart.evals?.datasetService;
  if (!datasetService) {
    throw new AesopExplorerDefaultError(
      'The evals plugin is unavailable, so no default dataset can be made; pass dataset_id',
      400
    );
  }
  if (!(await hasEvalsPrivilege(deps, EVALS_READ_PRIVILEGE))) {
    throw new AesopExplorerDefaultError(
      `Reading eval datasets requires ${EVALS_READ_PRIVILEGE}`,
      403
    );
  }
  const client = datasetService.getClient({ spaceId: deps.spaceId });
  const existing = await client.resolveByName(AESOP_DEFAULT_DATASET_NAME);
  if (existing) {
    return existing.id;
  }
  if (!(await hasEvalsPrivilege(deps, EVALS_MANAGE_PRIVILEGE))) {
    throw new AesopExplorerDefaultError(
      `Creating the default dataset requires ${EVALS_MANAGE_PRIVILEGE}; pass dataset_id`,
      403
    );
  }
  const created = await client.create({
    name: AESOP_DEFAULT_DATASET_NAME,
    description:
      'AESOP explorer fallback dataset, used when a candidate names no fitting dataset. Add examples before relying on it.',
    tags: ['aesop'],
  });
  return created.id;
};

/** The caller's `AESOP Decision Log` conversation, created when missing. */
export const resolveDefaultInvestigationId = async ({
  pluginsStart,
  request,
}: DefaultsDeps): Promise<string> => {
  const conversations = pluginsStart.agentBuilder?.conversations;
  if (!conversations) {
    throw new AesopExplorerDefaultError(
      'Agent Builder is unavailable, so no investigation can be made; pass investigation_id',
      400
    );
  }
  const client = await conversations.getScopedClient({ request });
  // The title query is fuzzy, so an exact match can sit past the first page.
  for (let page = 1; page <= DECISION_LOG_MAX_PAGES; page++) {
    const { results } = await client.search({
      query: AESOP_DECISION_LOG_TITLE,
      page,
      perPage: DECISION_LOG_PAGE_SIZE,
    });
    const existing = results.find(({ title }) => title === AESOP_DECISION_LOG_TITLE);
    if (existing) {
      return existing.id;
    }
    if (results.length < DECISION_LOG_PAGE_SIZE) {
      break;
    }
  }
  const created = await client.create({ title: AESOP_DECISION_LOG_TITLE });
  return created.id;
};
