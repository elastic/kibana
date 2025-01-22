/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { SearchRequest, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type {
  InitPrivmonResult,
  PrivilegedUserDoc,
  PrivmonLoginDoc,
  PrivmonPrivilegeDoc,
} from '../../../../common/api/entity_analytics/privmon';
import {
  getPrivmonLoginsIndex,
  getPrivmonPrivilegesIndex,
  getPrivmonUsersIndex,
  PRIVMON_LOGINS_INDEX_PATTERN,
  PRIVMON_LOGINS_INDEX_TEMPLATE_NAME,
  PRIVMON_PRIVILEGES_INDEX_PATTERN,
  PRIVMON_PRIVILEGES_INDEX_TEMPLATE_NAME,
  PRIVMON_USERS_INDEX_PATTERN,
  PRIVMON_USERS_INDEX_TEMPLATE_NAME,
} from '../../../../common/entity_analytics/privmon';
import { startPrivmonTask } from './task';
import type { EntityAnalyticsConfig } from '../types';
import { createPrivmonIngestPipeline } from './utils';
import { PRIVILEGED_USER_MAPPING } from './mappings';

interface PrivMonClientOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  namespace: string;
}

export interface PrivmonSearchOptions {
  from?: number;
  size?: number;
  query?: SearchRequest['query'];
  sort?: SearchRequest['sort'];
}

interface SimplifiedSearchResult<T> {
  total: number;
  records: T[];
}

const searchResponseToSimplifiedResult = <T>(
  response: SearchResponse<T>
): SimplifiedSearchResult<T> => {
  return {
    total:
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0,
    records: response.hits.hits.map((hit) => hit._source as T),
  };
};

export class PrivmonDataClient {
  constructor(private readonly options: PrivMonClientOpts) {}

  public async init({
    taskManager,
    config,
  }: {
    taskManager: TaskManagerStartContract;
    config: EntityAnalyticsConfig['privmon'];
  }): Promise<InitPrivmonResult> {
    const { esClient, logger, namespace } = this.options;

    const { id: pipelineId } = await createPrivmonIngestPipeline({
      esClient,
      logger,
    });

    // logins
    await esClient.indices.putIndexTemplate(
      {
        name: PRIVMON_LOGINS_INDEX_TEMPLATE_NAME,
        index_patterns: [PRIVMON_LOGINS_INDEX_PATTERN],
        data_stream: {},
        composed_of: ['ecs@mappings'],
        template: {
          mappings: {},
          settings: {
            index: {
              default_pipeline: pipelineId,
            },
          },
        },
      },
      {
        ignore: [400], // PoC only, ignore if it already exists
      }
    );

    await esClient.indices.createDataStream(
      {
        name: getPrivmonLoginsIndex(namespace),
      },
      {
        ignore: [400], // PoC only, ignore if it already exists
      }
    );

    logger.debug(
      `[PrivmonDataClient] Created index template ${PRIVMON_LOGINS_INDEX_TEMPLATE_NAME}`
    );

    // privileges
    await esClient.indices.putIndexTemplate(
      {
        name: PRIVMON_PRIVILEGES_INDEX_TEMPLATE_NAME,
        index_patterns: [PRIVMON_PRIVILEGES_INDEX_PATTERN],
        data_stream: {},
        composed_of: ['ecs@mappings'],
        template: {
          mappings: {},
          settings: {
            index: {
              default_pipeline: pipelineId,
            },
          },
        },
      },
      {
        ignore: [400], // PoC only, ignore if it already exists
      }
    );

    await esClient.indices.createDataStream(
      {
        name: getPrivmonPrivilegesIndex(namespace),
      },
      {
        ignore: [400], // PoC only, ignore if it already exists
      }
    );

    logger.debug(
      `[PrivmonDataClient] Created index template ${PRIVMON_PRIVILEGES_INDEX_TEMPLATE_NAME}`
    );
    // privileged users
    await esClient.indices.putIndexTemplate({
      name: PRIVMON_USERS_INDEX_TEMPLATE_NAME,
      body: {
        index_patterns: [PRIVMON_USERS_INDEX_PATTERN],
        composed_of: ['ecs@mappings'],
        template: {
          mappings: PRIVILEGED_USER_MAPPING,
          settings: {
            index: {
              default_pipeline: pipelineId,
            },
          },
        },
      },
    });

    await esClient.indices.create(
      {
        index: getPrivmonUsersIndex(namespace),
      },
      {
        ignore: [400], // PoC only, ignore if it already exists
      }
    );

    logger.debug(`[PrivmonDataClient] Created index template ${PRIVMON_USERS_INDEX_TEMPLATE_NAME}`);

    await startPrivmonTask({
      logger,
      namespace,
      taskManager,
    });

    logger.debug(`[PrivmonDataClient] Started Privmon task`);

    return { successful: true, errors: [] };
  }

  private async simpleSearch<T>({
    index,
    from,
    size,
    query,
  }: PrivmonSearchOptions & { index: string }): Promise<SimplifiedSearchResult<T>> {
    const { esClient } = this.options;
    const response = await esClient.search<T>({
      index,
      from,
      size,
      query,
    });

    return searchResponseToSimplifiedResult(response);
  }

  public async searchLogins(
    opts: PrivmonSearchOptions = {}
  ): Promise<SimplifiedSearchResult<PrivmonLoginDoc>> {
    return this.simpleSearch<PrivmonLoginDoc>({
      index: getPrivmonLoginsIndex(this.options.namespace),
      ...opts,
    });
  }

  public async searchPrivileges(
    opts: PrivmonSearchOptions = {}
  ): Promise<SimplifiedSearchResult<PrivmonPrivilegeDoc>> {
    return this.simpleSearch<PrivmonPrivilegeDoc>({
      index: getPrivmonPrivilegesIndex(this.options.namespace),
      ...opts,
    });
  }

  public async searchUsers(
    opts: PrivmonSearchOptions = {}
  ): Promise<SimplifiedSearchResult<PrivilegedUserDoc>> {
    return this.simpleSearch<PrivilegedUserDoc>({
      index: getPrivmonUsersIndex(this.options.namespace),
      ...opts,
    });
  }

  public async bulkUpsertUsers(users: PrivilegedUserDoc[]): Promise<void> {
    const { esClient } = this.options;

    if (users.length === 0) {
      return;
    }

    const body = users.flatMap((doc) => [
      { index: { _index: getPrivmonUsersIndex(this.options.namespace) } },
      doc,
    ]);

    const result = await esClient.bulk({
      body,
    });

    if (result.errors) {
      this.options.logger.error(
        `[PrivmonDataClient] Error upserting users: ${JSON.stringify(result.items)}`
      );
      throw new Error(`Error upserting users`);
    }
  }
}
