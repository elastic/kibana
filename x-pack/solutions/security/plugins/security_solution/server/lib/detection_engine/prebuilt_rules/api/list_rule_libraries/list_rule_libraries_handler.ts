/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IKibanaResponse,
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
} from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import {
  RULE_LIBRARY_DEFINITIONS,
  RULE_LIBRARY_SO_TYPE,
  ensureLibraries,
} from '@kbn/security-rule-libraries';
import type { RuleLibraryAttributes } from '@kbn/security-rule-libraries';
import type {
  ListRuleLibrariesResponseBody,
  RuleLibrarySummary,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionRequestHandlerContext } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { findVisibleRuleLibraries } from '../../logic/rule_libraries/find_visible_rule_libraries';

// Credentials can be embedded in a library url, and the page has no use for them.
const redactUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    parsed.username = '';
    parsed.password = '';
    return parsed.toString();
  } catch {
    return url;
  }
};

const toSummary = (
  id: string,
  attributes: RuleLibraryAttributes,
  ruleCount: number
): RuleLibrarySummary => ({
  id,
  title: attributes.title,
  description: attributes.description,
  provider: attributes.provider.type,
  built_in: RULE_LIBRARY_DEFINITIONS.some((definition) => definition.id === id),
  owner_type: attributes.owner?.type,
  license: attributes.license,
  scope: attributes.space_id ? 'space' : 'shared',
  version: attributes.version,
  sync_status: attributes.sync_status,
  synced_at: attributes.synced_at,
  last_error: attributes.last_error ?? undefined,
  rule_count: ruleCount,
  source_url: attributes.provider.url ? redactUrl(attributes.provider.url) : undefined,
  branch: attributes.provider.branch,
});

const definitionOrder = (id: string): number => {
  const index = RULE_LIBRARY_DEFINITIONS.findIndex((definition) => definition.id === id);
  return index === -1 ? RULE_LIBRARY_DEFINITIONS.length : index;
};

export const listRuleLibrariesHandler = async (
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest,
  response: KibanaResponseFactory,
  logger: Logger
): Promise<IKibanaResponse<ListRuleLibrariesResponseBody>> => {
  const siemResponse = buildSiemResponse(response);

  try {
    const ctx = await context.resolve(['core', 'securitySolution']);
    const client = ctx.core.savedObjects.getClient({
      includedHiddenTypes: [RULE_LIBRARY_SO_TYPE],
    });
    const spaceId = ctx.securitySolution.getSpaceId();

    await ensureLibraries({ client, logger });

    const [visibleLibraries, ruleCounts] = await Promise.all([
      findVisibleRuleLibraries(client, spaceId),
      createPrebuiltRuleAssetsClient(ctx.core.savedObjects.client).fetchRuleCountsByLibrary(),
    ]);

    const libraries = visibleLibraries
      .map(({ id, attributes }) => toSummary(id, attributes, ruleCounts[id] ?? 0))
      .sort(
        (a, b) => definitionOrder(a.id) - definitionOrder(b.id) || a.title.localeCompare(b.title)
      );

    return response.ok({ body: { libraries } });
  } catch (err) {
    logger.error(`listRuleLibrariesHandler: Caught error:`, err);
    const error = transformError(err);
    return siemResponse.error({
      body: error.message,
      statusCode: error.statusCode,
    });
  }
};
