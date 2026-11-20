/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { AlertingServerStart } from '@kbn/alerting-v2-plugin/server';
import type { CoreStart as CoreStartContract, KibanaRequest } from '@kbn/core/server';
import { PluginStart } from '@kbn/core-di';
import type { CoreDiServiceStart } from '@kbn/core-di';
import { CoreStart, Request } from '@kbn/core-di-server';
import { asSpaceId } from '@kbn/core-spaces-common';
import type { NightshiftSourcesServerStart } from '@kbn/nightshift-sources-plugin/server';
import type { SignificantEventsServerStart } from '@kbn/significant-events-plugin/server';
import { EngineHttpError } from '../errors/engine_http_error';
import { DetectionRulesClient } from '../rules/rules_client_token';
import { DetectionEngineDataClient } from './es_client_tokens';
import { KnowledgeIndicators, Sources } from './tokens';

/** The catalog is read in one page; a space with more sources than this is refused. */
const MAX_LISTED_SOURCES = 10_000;

/** A container forked for one piece of work done as the space's detection service account. */
type AccountScopeContainer = ReturnType<CoreDiServiceStart['fork']>;

/**
 * Builds the scope a tick or a rule reconciliation runs in: it forks the container and binds what
 * is read as the account behind a request, so the services resolved in it know no identity.
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
    private readonly alerting: AlertingServerStart
  ) {}

  /**
   * @param accountRequest A request authenticated as the space's detection service account.
   * @returns The forked container; the caller unbinds it when the work is done.
   */
  public async fork({
    accountRequest,
    spaceId,
  }: {
    accountRequest: KibanaRequest;
    spaceId: string;
  }): Promise<AccountScopeContainer> {
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
      .toConstantValue(this.significantEvents.getKnowledgeIndicatorReader({ spaceId }));
    // The rules are the account's: Alerting v2 runs them with its API key.
    scope.bind(DetectionRulesClient).toConstantValue(
      await this.alerting.getRulesClientWithRequestInSpace(accountRequest, asSpaceId(spaceId), {
        app: 'nightshift',
      })
    );

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
