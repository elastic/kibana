/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { AlertingServerStart } from '@kbn/alerting-v2-plugin/server';
import type { CoreStart as CoreStartContract, KibanaRequest, Logger } from '@kbn/core/server';
import { Logger as CoreLogger, PluginStart } from '@kbn/core-di';
import type { CoreDiServiceStart } from '@kbn/core-di';
import { CoreStart, Request } from '@kbn/core-di-server';
import { asSpaceId } from '@kbn/core-spaces-common';
import type { NightshiftSourcesServerStart } from '@kbn/nightshift-sources-plugin/server';
import type { SignificantEventsServerStart } from '@kbn/significant-events-plugin/server';
import { EngineHttpError } from '../errors/engine_http_error';
import { ManagedRuleReader } from '../rules/managed_rule_reader';
import { getErrorMessage } from '../errors/get_error_message';
import { DetectionRulesClient } from '../rules/rules_client_token';
import { DetectionEngineDataClient } from './es_client_tokens';
import { KnowledgeIndicators, Sources } from './tokens';

/** The catalog is read in one page; a space with more sources than this is refused. */
const MAX_LISTED_SOURCES = 10_000;

/** A container forked for one piece of work done as the space's detection service account. */
type AccountScopeContainer = ReturnType<CoreDiServiceStart['fork']>;

/**
 * Runs a tick or a rule reconciliation in its own scope: it forks the container, binds what is read
 * as the account behind a request, so the services resolved in it know no identity, and releases the
 * scope once the work is done.
 */
@injectable()
export class AccountScope {
  constructor(
    @inject(CoreStart('injection')) private readonly injection: CoreDiServiceStart,
    @inject(CoreStart('elasticsearch'))
    private readonly elasticsearch: CoreStartContract['elasticsearch'],
    @inject(PluginStart<NightshiftSourcesServerStart>('nightshiftSources'))
    private readonly nightshiftSources: NightshiftSourcesServerStart,
    @inject(PluginStart<SignificantEventsServerStart>('significantEvents'))
    private readonly significantEvents: SignificantEventsServerStart,
    @inject(PluginStart<AlertingServerStart>('alertingVTwo'))
    private readonly alerting: AlertingServerStart,
    @inject(CoreLogger) private readonly logger: Logger
  ) {}

  /**
   * Runs `fn` in a scope built for the account, then releases the scope, whether `fn` succeeded or
   * not.
   * @param accountRequest A request authenticated as the space's detection service account.
   */
  public async run<T>({
    accountRequest,
    spaceId,
    fn,
  }: {
    accountRequest: KibanaRequest;
    spaceId: string;
    fn: (scope: AccountScopeContainer) => Promise<T>;
  }): Promise<T> {
    const scope = await this.fork({ accountRequest, spaceId });

    try {
      return await fn(scope);
    } finally {
      // A failing cleanup must not replace the work's result, or its own error, with another one.
      try {
        await scope.unbindAllAsync();
      } catch (error) {
        this.logger.warn(`Could not release the account scope: ${getErrorMessage(error)}`);
      }
    }
  }

  private async fork({
    accountRequest,
    spaceId,
  }: {
    accountRequest: KibanaRequest;
    spaceId: string;
  }): Promise<AccountScopeContainer> {
    // Branded before forking, so a malformed id throws without leaving a forked container behind.
    const space = asSpaceId(spaceId);
    const scope = this.injection.fork();

    scope.bind(Request).toConstantValue(accountRequest);
    // Customer data is read as the account, never as kibana_system.
    scope
      .bind(DetectionEngineDataClient)
      .toConstantValue(this.elasticsearch.client.asScoped(accountRequest).asCurrentUser);
    scope.bind(Sources).toConstantValue({
      list: ({ enabledOnly }) => this.listSources({ accountRequest, enabledOnly }),
    });
    scope
      .bind(KnowledgeIndicators)
      .toConstantValue(this.significantEvents.getKnowledgeIndicatorReader({ spaceId: space }));
    try {
      // The rules are the account's: Alerting v2 runs them with its API key.
      scope.bind(DetectionRulesClient).toConstantValue(
        await this.alerting.getRulesClientWithRequestInSpace(accountRequest, space, {
          app: 'nightshift',
        })
      );
    } catch (error) {
      // `run` releases only a scope that was built.
      await scope.unbindAllAsync();
      throw error;
    }
    // Reads that rules client, so it lives and dies with the scope.
    scope.bind(ManagedRuleReader).toSelf();

    return scope;
  }

  private async listSources({
    accountRequest,
    enabledOnly,
  }: {
    accountRequest: KibanaRequest;
    enabledOnly: boolean;
  }) {
    const sourcesClient = await this.nightshiftSources.getSourcesClient({
      request: accountRequest,
    });
    const { sources, total } = await sourcesClient.list({
      page: 1,
      perPage: MAX_LISTED_SOURCES,
      enabled: enabledOnly ? true : undefined,
    });

    if (total > sources.length) {
      throw new EngineHttpError(
        `The space has ${total} sources, more than the ${MAX_LISTED_SOURCES} the engine reads.`,
        400
      );
    }

    return sources;
  }
}
