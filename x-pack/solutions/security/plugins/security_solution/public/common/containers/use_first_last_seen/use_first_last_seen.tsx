/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import * as i18n from './translations';

import { useSearchStrategy } from '../use_search_strategy';
import { FirstLastSeenQuery } from '../../../../common/search_strategy';
import type { Direction } from '../../../../common/search_strategy';
import type { ESQuery } from '../../../../common/typed_json';
import {
  buildHostFilterFromEntityIdentifiers,
  buildUserFilterFromEntityIdentifiers,
} from '../../../../common/search_strategy/security_solution/risk_score/common';

export interface FirstLastSeenArgs {
  errorMessage: string | null;
  firstSeen?: string | null;
  lastSeen?: string | null;
}
export interface UseFirstLastSeenBase {
  order: Direction.asc | Direction.desc;
  defaultIndex: string[];
  filterQuery?: ESQuery | string;
  /** When true, the search is not executed. Default: false. */
  skip?: boolean;
}

export interface UseFirstLastSeenWithField extends UseFirstLastSeenBase {
  field: string;
  value: string;
  entityIdentifiers?: never;
  entityType?: never;
}

export interface UseFirstLastSeenWithEntityIdentifiers extends UseFirstLastSeenBase {
  entityIdentifiers: Record<string, string>;
  entityType: 'host' | 'user';
  field?: never;
  value?: never;
}

export type UseFirstLastSeen = UseFirstLastSeenWithField | UseFirstLastSeenWithEntityIdentifiers;

const getEntityFilterFromIdentifiers = (
  entityIdentifiers: Record<string, string>,
  entityType: 'host' | 'user'
): ESQuery | undefined =>
  entityType === 'host'
    ? buildHostFilterFromEntityIdentifiers(entityIdentifiers)
    : buildUserFilterFromEntityIdentifiers(entityIdentifiers);

const getFieldAndValueFromEntityIdentifiers = (
  entityIdentifiers: Record<string, string>
): { field: string; value: string } => {
  const entries = Object.entries(entityIdentifiers);
  const [field, value] = entries[0] ?? ['host.name', ''];
  return { field, value: String(value) };
};

const getStableEntityIdentifiersKey = (identifiers: Record<string, string>): string =>
  JSON.stringify(
    Object.fromEntries(Object.entries(identifiers).sort(([a], [b]) => a.localeCompare(b)))
  );

export const useFirstLastSeen = (props: UseFirstLastSeen): [boolean, FirstLastSeenArgs] => {
  const { order, defaultIndex, filterQuery: externalFilterQuery, skip = false } = props;

  const entityIdentifiersKey =
    'entityIdentifiers' in props && props.entityIdentifiers && props.entityType
      ? getStableEntityIdentifiersKey(props.entityIdentifiers)
      : null;
  const entityType = 'entityType' in props ? props.entityType : null;
  const fieldFromProps = 'field' in props ? props.field : '';
  const valueFromProps = 'value' in props ? props.value : '';

  const { field, value, resolvedFilterQuery } = useMemo(() => {
    if (entityIdentifiersKey !== null && entityType) {
      const entityIdentifiers = JSON.parse(entityIdentifiersKey) as Record<string, string>;
      const entityFilter = getEntityFilterFromIdentifiers(entityIdentifiers, entityType);
      const { field: f, value: v } = getFieldAndValueFromEntityIdentifiers(entityIdentifiers);
      const combinedFilter =
        entityFilter && externalFilterQuery
          ? { bool: { filter: [entityFilter, externalFilterQuery] } }
          : entityFilter ?? externalFilterQuery;
      return { field: f, value: v, resolvedFilterQuery: combinedFilter };
    }
    return {
      field: fieldFromProps,
      value: valueFromProps,
      resolvedFilterQuery: externalFilterQuery,
    };
  }, [entityIdentifiersKey, entityType, externalFilterQuery, fieldFromProps, valueFromProps]);

  const { loading, result, search, error } = useSearchStrategy<typeof FirstLastSeenQuery>({
    factoryQueryType: FirstLastSeenQuery,
    initialResult: {
      firstSeen: null,
      lastSeen: null,
    },
    errorMessage: i18n.FAIL_FIRST_LAST_SEEN_HOST,
  });

  useEffect(() => {
    if (skip) return;
    search({
      defaultIndex,
      field,
      value,
      order,
      filterQuery: resolvedFilterQuery,
    });
  }, [defaultIndex, field, value, order, search, resolvedFilterQuery, skip]);

  const setFirstLastSeenResponse: FirstLastSeenArgs = useMemo(
    () => ({
      firstSeen: result.firstSeen,
      lastSeen: result.lastSeen,
      errorMessage: error ? (error as Error).toString() : null,
    }),
    [result, error]
  );

  return [loading, setFirstLastSeenResponse];
};
