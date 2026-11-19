/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { inject, injectable } from 'inversify';
import type { CoreStart as CoreStartContract, KibanaRequest, Logger } from '@kbn/core/server';
import { Logger as CoreLogger, PluginStart } from '@kbn/core-di';
import type { CoreDiServiceStart } from '@kbn/core-di';
import { CoreStart, Request } from '@kbn/core-di-server';
import type { NightshiftSourcesServerStart } from '@kbn/nightshift-sources-plugin/server';
import { EngineHttpError } from '../errors/engine_http_error';
import { getErrorMessage } from '../errors/get_error_message';
import { DetectionEngineDataClient } from './es_client_tokens';
import { EngineRunner } from './run_engine';
import type { TickResult } from './tick_result';
import { EnabledSources, RunContext } from './tokens';

const MINUTE_MS = 60_000;

/** The catalog is read in one page; a space with more sources than this is refused. */
const MAX_LISTED_SOURCES = 10_000;

/**
 * Runs one engine tick as the account behind a request. It forks a request scope, binds what the
 * run needs from that request, and resolves the runner in it, so the runner itself knows no
 * identity.
 */
@injectable()
export class TickService {
  constructor(
    @inject(CoreStart('injection')) private readonly injection: CoreDiServiceStart,
    @inject(CoreStart('elasticsearch'))
    private readonly elasticsearch: CoreStartContract['elasticsearch'],
    @inject(PluginStart<NightshiftSourcesServerStart>('nightshiftSources'))
    private readonly nightshiftSources: NightshiftSourcesServerStart,
    @inject(CoreLogger) private readonly logger: Logger
  ) {}

  /**
   * @param accountRequest A request authenticated as the space's detection service account.
   */
  public async run({
    accountRequest,
    spaceId,
    skipBacklog,
    abortSignal,
  }: {
    accountRequest: KibanaRequest;
    spaceId: string;
    skipBacklog: boolean;
    abortSignal: AbortSignal;
  }): Promise<TickResult> {
    const now = Date.now();
    const scope = this.injection.fork();

    // What the tick provides to the runner. The runner is bound in the fork too, so its
    // dependencies resolve from here.
    scope.bind(Request).toConstantValue(accountRequest);
    scope.bind(RunContext).toConstantValue({
      spaceId,
      runId: uuidv4(),
      scheduledMinute: Math.floor(now / MINUTE_MS) * MINUTE_MS,
    });
    // Customer data is read as the account, never as kibana_system.
    scope
      .bind(DetectionEngineDataClient)
      .toConstantValue(this.elasticsearch.client.asScoped(accountRequest).asCurrentUser);
    scope.bind(EnabledSources).toConstantValue({
      list: async () => {
        const sourcesClient = await this.nightshiftSources.getSourcesClient({
          request: accountRequest,
        });
        const { sources, total } = await sourcesClient.list({
          page: 1,
          perPage: MAX_LISTED_SOURCES,
          enabled: true,
        });

        if (total > sources.length) {
          throw new EngineHttpError(
            `The space has ${total} sources, more than the ${MAX_LISTED_SOURCES} the engine reads.`,
            400
          );
        }

        return sources;
      },
    });

    scope.bind(EngineRunner).toSelf();

    try {
      return await scope.get(EngineRunner).run({ now, skipBacklog, abortSignal });
    } finally {
      // A failing cleanup must not replace the tick's result, or its own error, with another one.
      try {
        await scope.unbindAllAsync();
      } catch (error) {
        this.logger.warn(`Could not release the tick scope: ${getErrorMessage(error)}`);
      }
    }
  }
}
