/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReplaySubject, firstValueFrom, combineLatest } from 'rxjs';

import type {
  SearchHit,
  UpdateResponse,
  WriteResponseBase,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { DataStreamSpacesAdapter } from '@kbn/data-stream-adapter';
import type { DefendInsight, DefendInsightsPostRequestBody } from '@kbn/elastic-assistant-common';

import type {
  SearchParams,
  SecurityWorkflowInsight,
} from '../../../../common/endpoint/types/workflow_insights';
import type { EndpointAppContextService } from '../../endpoint_app_context_services';

import { SecurityWorkflowInsightsFailedInitialized } from './errors';
import {
  buildEsQueryParams,
  checkIfRemediationExists,
  createDatastream,
  createPipeline,
  generateInsightId,
  getUniqueInsights,
} from './helpers';
import { DATA_STREAM_NAME } from './constants';
import { buildWorkflowInsights } from './builders';

const DEFAULT_PAGE_SIZE = 10;

interface SetupInterface {
  kibanaVersion: string;
  logger: Logger;
  isFeatureEnabled: boolean;
  endpointContext: EndpointAppContextService;
}

interface StartInterface {
  esClient: ElasticsearchClient;
}

class SecurityWorkflowInsightsService {
  private setup$ = new ReplaySubject<void>(1);
  private start$ = new ReplaySubject<void>(1);
  private stop$ = new ReplaySubject<void>(1);
  private ds: DataStreamSpacesAdapter | undefined;
  private _esClient: ElasticsearchClient | undefined;
  private _endpointContext: EndpointAppContextService | undefined;
  private _logger: Logger | undefined;
  private _isInitialized: Promise<[void, void]> = firstValueFrom(
    combineLatest<[void, void]>([this.setup$, this.start$])
  );
  private isFeatureEnabled = false;

  public get isInitialized() {
    return this._isInitialized;
  }

  public setup({ kibanaVersion, logger, isFeatureEnabled, endpointContext }: SetupInterface) {
    this.isFeatureEnabled = isFeatureEnabled;
    if (!isFeatureEnabled) {
      return;
    }

    this._logger = logger;
    this._endpointContext = endpointContext;

    try {
      this.ds = createDatastream(kibanaVersion);
    } catch (err) {
      this.logger.warn(new SecurityWorkflowInsightsFailedInitialized(err.message).message);
      return;
    }

    this.setup$.next();
  }

  public async start({ esClient }: StartInterface) {
    if (!this.isFeatureEnabled) {
      return;
    }

    this._esClient = esClient;
    await firstValueFrom(this.setup$);

    try {
      await createPipeline(esClient);
      await this.ds?.install({
        logger: this.logger,
        esClient,
        pluginStop$: this.stop$,
      });

      try {
        await esClient.indices.createDataStream({ name: DATA_STREAM_NAME });
      } catch (err) {
        if (err?.body?.error?.type === 'resource_already_exists_exception') {
          this.logger.debug(`Datastream ${DATA_STREAM_NAME} already exists`);
        } else {
          throw new SecurityWorkflowInsightsFailedInitialized(err.message);
        }
      }
    } catch (err) {
      this.logger.warn(err.message);
      return;
    }

    this.start$.next();
  }

  public stop() {
    this.setup$.next();
    this.setup$.complete();
    this.start$.next();
    this.start$.complete();
    this.stop$.next();
    this.stop$.complete();
  }

  public async createFromDefendInsights(
    defendInsights: DefendInsight[],
    request: KibanaRequest<unknown, unknown, DefendInsightsPostRequestBody>
  ): Promise<Array<Awaited<WriteResponseBase | void>>> {
    await this.isInitialized;

    const workflowInsights = await buildWorkflowInsights({
      defendInsights,
      request,
      endpointMetadataService: this.endpointContext.getEndpointMetadataService(),
      esClient: this.esClient,
    });
    const uniqueInsights = getUniqueInsights(workflowInsights);

    return Promise.all(uniqueInsights.map((insight) => this.create(insight)));
  }

  public async create(insight: SecurityWorkflowInsight): Promise<WriteResponseBase | void> {
    await this.isInitialized;

    const id = generateInsightId(insight);

    const remediationExists = await checkIfRemediationExists({
      insight,
      exceptionListsClient: this.endpointContext.getExceptionListsClient(),
      endpointMetadataClient: this.endpointContext.getEndpointMetadataService(),
    });

    if (remediationExists) {
      return;
    }

    // if insight already exists, update instead
    const existingInsights = await this.fetch({ ids: [id] });
    if (existingInsights.length) {
      return this.update(id, insight, existingInsights[0]._index);
    }

    const response = await this.esClient.index<SecurityWorkflowInsight>({
      index: DATA_STREAM_NAME,
      id,
      body: insight,
      refresh: 'wait_for',
      op_type: 'create',
    });

    return response;
  }

  public async update(
    id: string,
    insight: Partial<SecurityWorkflowInsight>,
    backingIndex?: string
  ): Promise<UpdateResponse> {
    await this.isInitialized;

    let index = backingIndex;
    if (!index) {
      const retrievedInsight = (await this.fetch({ ids: [id] }))[0];
      index = retrievedInsight?._index;
    }

    if (!index) {
      throw new Error('invalid backing index for updating workflow insight');
    }

    const response = await this.esClient.update<SecurityWorkflowInsight>({
      index,
      id,
      body: { doc: insight },
      refresh: 'wait_for',
    });

    return response;
  }

  public async fetch(params?: SearchParams): Promise<Array<SearchHit<SecurityWorkflowInsight>>> {
    await this.isInitialized;

    const size = params?.size ?? DEFAULT_PAGE_SIZE;
    const from = params?.from ?? 0;

    const termFilters = params ? buildEsQueryParams(params) : [];
    const response = await this.esClient.search<SecurityWorkflowInsight>({
      index: DATA_STREAM_NAME,
      body: {
        query: {
          bool: {
            must: termFilters,
          },
        },
        size,
        from,
      },
    });

    return response?.hits?.hits ?? [];
  }

  private get esClient(): ElasticsearchClient {
    if (!this._esClient) {
      throw new SecurityWorkflowInsightsFailedInitialized('no elasticsearch client found');
    }

    return this._esClient;
  }

  private get logger(): Logger {
    if (!this._logger) {
      throw new SecurityWorkflowInsightsFailedInitialized('no logger found');
    }

    return this._logger;
  }

  private get endpointContext(): EndpointAppContextService {
    if (!this._endpointContext) {
      throw new SecurityWorkflowInsightsFailedInitialized('no endpoint context found');
    }

    return this._endpointContext;
  }
}

export const securityWorkflowInsightsService = new SecurityWorkflowInsightsService();
