/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Filter } from '@kbn/es-query';

import type { ExperimentalFeatures } from '../../../../../../common';
import type {
  BaseFieldsLatest,
  WrappedFieldsLatest,
} from '../../../../../../common/api/detection_engine/model/alerts';
import type { RuleServices } from '../../types';
import type { IRuleExecutionLogForExecutors } from '../../../rule_monitoring';

export type EnrichmentType = estypes.SearchHit<unknown>;

export type EventsForEnrichment<T extends BaseFieldsLatest> = Pick<
  WrappedFieldsLatest<T>,
  '_id' | '_source'
>;

export type EnrichmentFunction = <T extends BaseFieldsLatest>(
  e: EventsForEnrichment<T>
) => EventsForEnrichment<T>;

export interface EventsMapByEnrichments {
  [id: string]: EnrichmentFunction[];
}

export type MergeEnrichments = <T extends BaseFieldsLatest>(
  allEnrichmentsResults: EventsMapByEnrichments[]
) => EventsMapByEnrichments;

export type ApplyEnrichmentsToEvents = <T extends BaseFieldsLatest>(params: {
  events: Array<EventsForEnrichment<T>>;
  enrichmentsList: EventsMapByEnrichments[];
  logger: IRuleExecutionLogForExecutors;
}) => Array<EventsForEnrichment<T>>;

interface BasedEnrichParamters<T extends BaseFieldsLatest> {
  services: RuleServices;
  logger: IRuleExecutionLogForExecutors;
  events: Array<EventsForEnrichment<T>>;
}

export type GetEventValue = <T extends BaseFieldsLatest>(
  events: EventsForEnrichment<T>,
  path: string
) => string | undefined;

export type GetFieldValue = (events: EnrichmentType, path: string) => string | undefined;

export type MakeSingleFieldMatchQuery = (params: {
  values: string[];
  searchByField: string;
  extraFilters?: QueryDslQueryContainer[];
}) => Filter;

export type SearchEnrichments = (params: {
  index: string[];
  services: RuleServices;
  logger: IRuleExecutionLogForExecutors;
  query: Filter;
  fields: string[];
}) => Promise<EnrichmentType[]>;

export type GetIsRiskScoreAvailable = (params: {
  spaceId: string;
  services: RuleServices;
}) => Promise<boolean>;

export type IsIndexExist = (params: { services: RuleServices; index: string }) => Promise<boolean>;

export type CreateRiskEnrichment = <T extends BaseFieldsLatest>(
  params: BasedEnrichParamters<T> & {
    spaceId: string;
  }
) => Promise<EventsMapByEnrichments>;

export type CreateCriticalityEnrichment = <T extends BaseFieldsLatest>(
  params: BasedEnrichParamters<T> & {
    spaceId: string;
  }
) => Promise<EventsMapByEnrichments>;

export type CreateEnrichmentFunction = (enrichmentDoc: EnrichmentType) => EnrichmentFunction;

export type CreateFieldsMatchEnrichment = <T extends BaseFieldsLatest>(
  params: BasedEnrichParamters<T> & {
    name: string;
    index: string[];
    mappingField: {
      /** The field on events which contains the value we'll use to build a query. */
      eventField: string;
      /** Used in a `match` query to find documents that match the values of `eventField`. */
      enrichmentField: string;
    };
    /** Specifies which fields should be returned when querying the enrichment index. */
    enrichmentResponseFields: string[];
    createEnrichmentFunction: CreateEnrichmentFunction;
    extraFilters?: QueryDslQueryContainer[];
  }
) => Promise<EventsMapByEnrichments>;

export type EnrichEventsFunction = <T extends BaseFieldsLatest>(
  params: BasedEnrichParamters<T> & {
    spaceId: string;
    experimentalFeatures?: ExperimentalFeatures;
  }
) => Promise<Array<EventsForEnrichment<T>>>;

export type CreateEnrichEventsFunction = (params: {
  services: RuleServices;
  logger: IRuleExecutionLogForExecutors;
}) => EnrichEvents;

export type EnrichEvents = <T extends BaseFieldsLatest>(
  alerts: Array<EventsForEnrichment<T>>,
  params: { spaceId: string },
  experimentalFeatures?: ExperimentalFeatures
) => Promise<Array<EventsForEnrichment<T>>>;

interface Risk {
  calculated_level: string;
  calculated_score_norm: string;
}
export interface RiskEnrichmentFields {
  host?: {
    name?: string;
    risk?: Risk;
  };
  user?: {
    name?: string;
    risk?: Risk;
  };
}
