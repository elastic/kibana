/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OtherResult } from '@kbn/agent-builder-common/tools/tool_result';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server';
import type { KibanaRequest } from '@kbn/core/server';
import type { SourcesClient } from '@kbn/nightshift-sources-plugin/server';
import {
  assertCanManageSignificantEvents,
  assertCanReadSignificantEvents,
} from '../../../routes/utils/assert_can_manage_significant_events';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import type { SourceToolDeps } from './source_tool_deps';
import { formatSourceToolError } from './source_tool_error';

const PRIVILEGE_ASSERTIONS = {
  read: assertCanReadSignificantEvents,
  manage: assertCanManageSignificantEvents,
};

/** Runs `run` after the access and privilege checks, turning any failure into an error result for the agent. */
export const runSourceTool = async ({
  action,
  privilege,
  request,
  getScopedClients,
  server,
  logger,
  run,
}: SourceToolDeps & {
  /** What the tool does, as it reads in "Failed to <action>: <reason>". */
  action: string;
  privilege: keyof typeof PRIVILEGE_ASSERTIONS;
  request: KibanaRequest;
  run: (params: { sourcesClient: SourcesClient }) => Promise<OtherResult['data']>;
}): Promise<ToolHandlerStandardReturn> => {
  try {
    const { licensing, sourcesClient } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });
    await PRIVILEGE_ASSERTIONS[privilege]({ request, server });

    return { results: [{ type: ToolResultType.other, data: await run({ sourcesClient }) }] };
  } catch (error) {
    const message = `Failed to ${action}: ${formatSourceToolError(error)}`;
    logger.error(message);
    return { results: [{ type: ToolResultType.error, data: { message } }] };
  }
};
