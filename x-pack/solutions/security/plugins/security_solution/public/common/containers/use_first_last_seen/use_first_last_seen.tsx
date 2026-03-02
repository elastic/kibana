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
  entityType: 'host' | 'user' | 'service';
  field?: never;
  value?: never;
}

export type UseFirstLastSeen = UseFirstLastSeenWithField | UseFirstLastSeenWithEntityIdentifiers;

export const useFirstLastSeen = (props: UseFirstLastSeen): [boolean, FirstLastSeenArgs] => {
  const { order, defaultIndex, filterQuery: externalFilterQuery, skip = false } = props;

  const isEntityIdentifiersMode =
    'entityIdentifiers' in props &&
    props.entityIdentifiers != null &&
    Object.keys(props.entityIdentifiers).length > 0 &&
    'entityType' in props &&
    props.entityType != null;

  const entityIdentifiersFromProps =
    'entityIdentifiers' in props ? props.entityIdentifiers : undefined;
  const entityTypeFromProps = 'entityType' in props ? props.entityType : undefined;
  const fieldFromProps = 'field' in props ? props.field : undefined;
  const valueFromProps = 'value' in props ? props.value : undefined;

  const searchParams = useMemo(() => {
    if (isEntityIdentifiersMode && entityIdentifiersFromProps && entityTypeFromProps) {
      return {
        entityIdentifiers: entityIdentifiersFromProps,
        entityType: entityTypeFromProps,
        filterQuery: externalFilterQuery,
      };
    }
    if (fieldFromProps != null && valueFromProps != null) {
      return {
        field: fieldFromProps,
        value: valueFromProps,
        filterQuery: externalFilterQuery,
      };
    }
    return null;
  }, [
    isEntityIdentifiersMode,
    entityIdentifiersFromProps,
    entityTypeFromProps,
    fieldFromProps,
    valueFromProps,
    externalFilterQuery,
  ]);

  const { loading, result, search, error } = useSearchStrategy<typeof FirstLastSeenQuery>({
    factoryQueryType: FirstLastSeenQuery,
    initialResult: {
      firstSeen: null,
      lastSeen: null,
    },
    errorMessage: i18n.FAIL_FIRST_LAST_SEEN_HOST,
  });

  useEffect(() => {
    if (skip || searchParams == null) return;
    search({
      defaultIndex,
      order,
      ...searchParams,
    });
  }, [defaultIndex, order, search, searchParams, skip]);

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
