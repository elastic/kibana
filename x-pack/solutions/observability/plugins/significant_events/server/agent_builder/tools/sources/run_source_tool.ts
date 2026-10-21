/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { SourcesClient } from '@kbn/nightshift-sources-plugin/server';
import type { GetScopedClients } from '../../../routes/types';
import {
  assertCanManageSignificantEvents,
  assertCanReadSignificantEvents,
} from '../../../routes/utils/assert_can_manage_significant_events';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import type { SignificantEventsServer } from '../../../types';
import { formatSourceToolError } from './source_tool_error';

const PRIVILEGE_ASSERTIONS = {
  read: assertCanReadSignificantEvents,
  manage: assertCanManageSignificantEvents,
};

/**
 * What every source tool does around its own work: checks that the feature is accessible and that
 * the caller holds the privilege, runs `run`, and turns any failure into an error result that
 * names the `action` and carries a message the agent can relay.
 */
export const runSourceTool = async ({
  action,
  privilege,
  request,
  getScopedClients,
  server,
  logger,
  run,
}: {
  /** What the tool does, as it reads in "Failed to <action>: <reason>". */
  action: string;
  privilege: keyof typeof PRIVILEGE_ASSERTIONS;
  request: KibanaRequest;
  getScopedClients: GetScopedClients;
  server: SignificantEventsServer;
  logger: Logger;
  run: (params: { sourcesClient: SourcesClient }) => Promise<Record<string, unknown>>;
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
