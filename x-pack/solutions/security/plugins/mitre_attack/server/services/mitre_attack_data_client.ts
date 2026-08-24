/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type {
  ISavedObjectsRepository,
  SavedObjectsRawDocSource,
} from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { MITRE_ATTACK_ENTITY_SO_TYPE } from '../../common/constants';
import type {
  MitreEntity,
  MitreEntityAttributes,
  MitreEntityType,
  MitreFramework,
} from '../../common/schema';

export type RetrievalMode = 'keyword' | 'semantic';

export interface MitreListParams {
  framework?: MitreFramework;
  frameworkVersion?: string;
  types?: MitreEntityType[];
  includeInactive?: boolean;
}

export interface MitreSearchParams extends MitreListParams {
  query: string;
  size?: number;
  mode?: RetrievalMode;
}

export interface MitreSearchHit {
  entity: MitreEntity;
  score: number;
}

export interface MitreAttackDataClient {
  getById(
    id: string,
    opts?: Pick<MitreListParams, 'framework' | 'frameworkVersion'>
  ): Promise<MitreEntity | undefined>;
  list(params?: MitreListParams): Promise<MitreEntity[]>;
  search(params: MitreSearchParams): Promise<MitreSearchHit[]>;
}

const ATTR_PREFIX = MITRE_ATTACK_ENTITY_SO_TYPE;

interface BuiltFilters {
  filter: estypes.QueryDslQueryContainer[];
  mustNot: estypes.QueryDslQueryContainer[];
  framework: string;
  frameworkVersion: string;
}

const buildFilters = (params: MitreListParams, defaultFrameworkVersion: string): BuiltFilters => {
  const {
    framework = 'enterprise',
    frameworkVersion = defaultFrameworkVersion,
    types,
    includeInactive = false,
  } = params;

  const filter: estypes.QueryDslQueryContainer[] = [
    { term: { [`${ATTR_PREFIX}.framework`]: framework } },
    { term: { [`${ATTR_PREFIX}.framework_version`]: frameworkVersion } },
  ];

  if (types && types.length > 0) {
    filter.push({ terms: { [`${ATTR_PREFIX}.type`]: types } });
  }

  const mustNot: estypes.QueryDslQueryContainer[] = includeInactive
    ? []
    : [
        { term: { [`${ATTR_PREFIX}.revoked`]: true } },
        { term: { [`${ATTR_PREFIX}.deprecated`]: true } },
      ];

  return { filter, mustNot, framework, frameworkVersion };
};

const stripSemanticContent = (attrs: MitreEntityAttributes): MitreEntity => {
  const { semantic_content: _sc, ...entity } = attrs;
  return entity as MitreEntity;
};

const hitToEntity = (hit: { _source?: SavedObjectsRawDocSource }): MitreEntity => {
  const rawAttrs = (hit._source?.[MITRE_ATTACK_ENTITY_SO_TYPE] ?? {}) as MitreEntityAttributes;
  return stripSemanticContent(rawAttrs);
};

export class MitreAttackDataClientImpl implements MitreAttackDataClient {
  constructor(
    private readonly repository: ISavedObjectsRepository,
    private readonly defaultFrameworkVersion: string,
    private readonly logger: Logger
  ) {}

  async getById(
    id: string,
    opts: Pick<MitreListParams, 'framework' | 'frameworkVersion'> = {}
  ): Promise<MitreEntity | undefined> {
    const framework = opts.framework ?? 'enterprise';
    const frameworkVersion = opts.frameworkVersion ?? this.defaultFrameworkVersion;
    const soId = `${framework}:${frameworkVersion}:${id}`;
    try {
      const so = await this.repository.get<MitreEntityAttributes>(
        MITRE_ATTACK_ENTITY_SO_TYPE,
        soId
      );
      return stripSemanticContent(so.attributes);
    } catch (err: unknown) {
      if (err instanceof Error && SavedObjectsErrorHelpers.isNotFoundError(err)) {
        return undefined;
      }
      throw err;
    }
  }

  async list(params: MitreListParams = {}): Promise<MitreEntity[]> {
    const { filter, mustNot } = buildFilters(params, this.defaultFrameworkVersion);

    const esQuery: estypes.QueryDslQueryContainer = {
      bool: {
        filter,
        ...(mustNot.length > 0 ? { must_not: mustNot } : {}),
      },
    };

    const result = await this.repository.search({
      type: MITRE_ATTACK_ENTITY_SO_TYPE,
      namespaces: ['*'],
      query: esQuery,
      size: 2000,
      sort: [{ [`${ATTR_PREFIX}.id`]: { order: 'asc' } }],
    });

    this.logger.debug(`MITRE list: returned ${result.hits.hits.length} entities`);
    return result.hits.hits.map(hitToEntity);
  }

  async search(params: MitreSearchParams): Promise<MitreSearchHit[]> {
    const { query: searchQuery, size = 25, mode = 'keyword', ...listParams } = params;
    const { filter, mustNot } = buildFilters(listParams, this.defaultFrameworkVersion);

    const scoringClause: estypes.QueryDslQueryContainer =
      mode === 'semantic'
        ? {
            semantic: { field: `${ATTR_PREFIX}.semantic_content`, query: searchQuery },
          }
        : {
            multi_match: {
              query: searchQuery,
              fields: [
                `${ATTR_PREFIX}.name.text^3`,
                `${ATTR_PREFIX}.description`,
                `${ATTR_PREFIX}.id^2`,
              ],
            },
          };

    const esQuery: estypes.QueryDslQueryContainer = {
      bool: {
        must: [scoringClause],
        filter,
        ...(mustNot.length > 0 ? { must_not: mustNot } : {}),
      },
    };

    const result = await this.repository.search({
      type: MITRE_ATTACK_ENTITY_SO_TYPE,
      namespaces: ['*'],
      query: esQuery,
      size,
    });

    this.logger.debug(`MITRE search (${mode}): returned ${result.hits.hits.length} hits`);
    return result.hits.hits.map((hit) => ({
      entity: hitToEntity(hit),
      score: hit._score ?? 0,
    }));
  }
}
