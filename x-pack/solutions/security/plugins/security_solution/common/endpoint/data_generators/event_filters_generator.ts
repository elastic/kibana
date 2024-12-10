/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
  ListOperator,
} from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import { exceptionItemToCreateExceptionItem } from './exceptions_list_item_generator';
import { GLOBAL_ARTIFACT_TAG } from '../service/artifacts';
import { BaseDataGenerator } from './base_data_generator';
import { ENDPOINT_EVENTS_LOG_INDEX_FIELDS } from './common/alerts_ecs_fields';

const ENTRY_OPERATORS: readonly ListOperator[] = ['included', 'excluded'];

export class EventFiltersGenerator extends BaseDataGenerator<ExceptionListItemSchema> {
  generate(overrides: Partial<ExceptionListItemSchema> = {}): ExceptionListItemSchema {
    return {
      id: this.seededUUIDv4(),
      item_id: this.seededUUIDv4(),
      list_id: ENDPOINT_ARTIFACT_LISTS.eventFilters.id,
      meta: undefined,
      name: `Event filter (${this.randomString(5)})`,
      description: `created by ${this.constructor.name}`,
      tags: [GLOBAL_ARTIFACT_TAG],
      entries: this.randomEventFilterEntries(),
      expire_time: undefined,
      namespace_type: 'agnostic',
      type: 'simple',
      os_types: [this.randomOSFamily()] as ExceptionListItemSchema['os_types'],
      tie_breaker_id: this.seededUUIDv4(),
      _version: this.randomString(5),
      comments: [],
      created_at: this.randomPastDate(),
      created_by: this.randomUser(),
      updated_at: '2020-04-20T15:25:31.830Z',
      updated_by: this.randomUser(),
      ...overrides,
    };
  }

  generateEventFilterForCreate(
    overrides: Partial<CreateExceptionListItemSchema> = {}
  ): CreateExceptionListItemSchema {
    return {
      ...exceptionItemToCreateExceptionItem(this.generate()),
      ...overrides,
    };
  }

  protected randomEventFilterEntries(
    count: number = this.randomN(5)
  ): ExceptionListItemSchema['entries'] {
    return Array.from({ length: count || 1 }, () => {
      if (this.randomBoolean()) {
        // single entry
        return {
          field: this.randomChoice(ENDPOINT_EVENTS_LOG_INDEX_FIELDS),
          operator: this.randomChoice(ENTRY_OPERATORS),
          type: 'match',
          value: this.randomString(10),
        };
      } else {
        // nested entry
        return {
          field: this.randomChoice(ENDPOINT_EVENTS_LOG_INDEX_FIELDS),
          type: 'nested',
          entries: [
            {
              field: this.randomChoice(ENDPOINT_EVENTS_LOG_INDEX_FIELDS),
              operator: this.randomChoice(ENTRY_OPERATORS),
              type: 'match',
              value: this.randomString(10),
            },
          ],
        };
      }
    });
  }
}
