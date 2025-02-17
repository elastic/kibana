/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type {
  QueryDslQueryContainer,
  SearchRequest,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/types';
import objectHash from 'object-hash';
import type { DataViewsService } from '@kbn/data-plugin/common';
import type {
  InitPrivmonResult,
  PrivilegedUserDoc,
  PrivilegedUserIdentityFields,
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
import {
  createPrivmonIngestPipeline,
  mergePrivilegedUsersByUser,
  privilegedUsersToUserQuery,
} from './utils';
import {
  PRIVILEGED_USER_MAPPING,
  LOGIN_MAPPING,
  createAndStartPrivmonMlJobs,
  createPrivmonDataViews,
  createPrivmonDetectionRules,
} from './assets';
import type { IDetectionRulesClient } from '../../detection_engine/rule_management/logic/detection_rules_client/detection_rules_client_interface';

interface PrivMonClientOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  namespace: string;
  dataViewsService: DataViewsService;
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
    detectionRulesClient,
    config,
  }: {
    taskManager: TaskManagerStartContract;
    config: EntityAnalyticsConfig['privmon'];
    detectionRulesClient: IDetectionRulesClient;
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
          mappings: LOGIN_MAPPING,
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

    await createPrivmonDataViews(this.options.dataViewsService, namespace, logger);

    await createAndStartPrivmonMlJobs({
      esClient,
      logger,
      namespace,
    });

    await createPrivmonDetectionRules({
      detectionRulesClient,
      logger,
      namespace,
    });

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

  public async findSimilarUsers(
    user: PrivilegedUserIdentityFields
  ): Promise<{ users: PrivilegedUserDoc[] }> {
    const { logger } = this.options;

    const mustNotQuery: QueryDslQueryContainer[] = [
      {
        term: {
          'user.name': user.name,
        },
      },
    ];

    const shouldQuery: QueryDslQueryContainer[] = [
      {
        wildcard: {
          'user.name': {
            value: `*${user.name}*`,
          },
        },
      },
      {
        wildcard: {
          'user.id': {
            value: `*${user.name}*`,
          },
        },
      },
      {
        match: {
          'user.name.text': {
            query: user.name,
            fuzziness: 'AUTO',
          },
        },
      },
      {
        match: {
          'user.id.text': {
            query: user.name,
            fuzziness: 'AUTO',
          },
        },
      },
    ];

    if (user.id) {
      shouldQuery.push(
        {
          wildcard: {
            'user.id': {
              value: `*${user.id}*`,
            },
          },
        },
        {
          wildcard: {
            'user.name': {
              value: `*${user.id}*`,
            },
          },
        },
        {
          match: {
            'user.id.text': {
              query: user.id,
              fuzziness: 'AUTO',
            },
          },
        },
        {
          match: {
            'user.name.text': {
              query: user.id,
              fuzziness: 'AUTO',
            },
          },
        }
      );

      mustNotQuery.push({
        term: {
          'user.id': user.id,
        },
      });
    }

    const { records: users } = await this.searchUsers({
      query: {
        bool: {
          should: shouldQuery,
          must_not: mustNotQuery,
        },
      },
    });

    logger.debug(
      `[PrivmonDataClient] Found ${users.length} similar users for ${JSON.stringify(user)}`
    );

    return { users };
  }

  public async bulkUpsertUsers(users: PrivilegedUserDoc[]): Promise<{
    created: number;
    updated: number;
  }> {
    const { esClient, logger, namespace } = this.options;

    if (users.length === 0) {
      return {
        created: 0,
        updated: 0,
      };
    }

    const { records: existingUsers } = await this.searchUsers({
      query: privilegedUsersToUserQuery(users, logger),
      size: users.length,
    });

    const mergedUsers = mergePrivilegedUsersByUser([...existingUsers, ...users]);

    const body = mergedUsers.flatMap((doc) => [
      {
        index: {
          _index: getPrivmonUsersIndex(namespace),
          _id: objectHash(doc.user),
        },
      },
      doc,
    ]);

    const result = await esClient.bulk({
      body,
    });

    if (result.errors) {
      logger.error(`[PrivmonDataClient] Error upserting users: ${JSON.stringify(result.items)}`);
      throw new Error(`Error upserting users`);
    }

    const mergedUserCount = mergedUsers.length;
    const existingUserCount = existingUsers.length;

    return {
      created: mergedUserCount - existingUserCount,
      updated: existingUserCount,
    };
  }
}
