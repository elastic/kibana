/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CHANGE_POINT_TYPES,
  MAX_RULE_NAME_LENGTH,
  type ChangePointType,
} from '@kbn/significant-events-schema';
import { useCallback, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  clearNightshiftSignalIdParam,
  getNightshiftSignalIdFromSearch,
  setNightshiftSignalIdParam,
} from '../../../common/url_params';
import { PAGE_QUERY_PARAM } from '../constants';
import { useUrlSearchParam } from '../use_url_search_param';

export const SIGNALS_SEARCH_QUERY_PARAM = 'signalsSearch';
const CHANGE_TYPE_QUERY_PARAM = 'changeType';

const isChangePointType = (value: string): value is ChangePointType =>
  CHANGE_POINT_TYPES.includes(value as ChangePointType);

const getPage = (params: URLSearchParams): number => {
  const value = Number(params.get(PAGE_QUERY_PARAM));
  return Number.isInteger(value) && value > 0 ? value : 1;
};

export const useSignalsUrlState = () => {
  const history = useHistory();
  const { pathname, search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const {
    value: searchValue,
    query: searchQuery,
    onChange: onSearchChange,
    clear: clearSearch,
  } = useUrlSearchParam(SIGNALS_SEARCH_QUERY_PARAM, MAX_RULE_NAME_LENGTH);
  const changeTypes = params.getAll(CHANGE_TYPE_QUERY_PARAM).filter(isChangePointType);
  const page = getPage(params);
  const signalId = getNightshiftSignalIdFromSearch(search);

  const updateParams = useCallback(
    (update: (nextParams: URLSearchParams) => void, replace = false) => {
      const nextParams = new URLSearchParams(search);
      update(nextParams);
      const nextLocation = { pathname, search: nextParams.toString() };
      if (replace) {
        history.replace(nextLocation);
      } else {
        history.push(nextLocation);
      }
    },
    [history, pathname, search]
  );

  const setChangeTypes = useCallback(
    (nextChangeTypes: ChangePointType[]) => {
      updateParams((nextParams) => {
        nextParams.delete(CHANGE_TYPE_QUERY_PARAM);
        nextChangeTypes.forEach((changeType) =>
          nextParams.append(CHANGE_TYPE_QUERY_PARAM, changeType)
        );
        nextParams.delete(PAGE_QUERY_PARAM);
      });
    },
    [updateParams]
  );

  const setPage = useCallback(
    (nextPage: number, replace = false) => {
      updateParams((nextParams) => {
        if (nextPage > 1) {
          nextParams.set(PAGE_QUERY_PARAM, String(nextPage));
        } else {
          nextParams.delete(PAGE_QUERY_PARAM);
        }
      }, replace);
    },
    [updateParams]
  );

  const openSignal = useCallback(
    (nextSignalId: string) => {
      updateParams((nextParams) => setNightshiftSignalIdParam(nextParams, nextSignalId));
    },
    [updateParams]
  );

  const closeSignal = useCallback(
    (replace = false) => {
      updateParams(clearNightshiftSignalIdParam, replace);
    },
    [updateParams]
  );

  const clearFilters = useCallback(() => {
    clearSearch();
    updateParams((nextParams) => {
      nextParams.delete(SIGNALS_SEARCH_QUERY_PARAM);
      nextParams.delete(CHANGE_TYPE_QUERY_PARAM);
      nextParams.delete(PAGE_QUERY_PARAM);
    });
  }, [clearSearch, updateParams]);

  return {
    searchValue,
    searchQuery,
    changeTypes,
    page,
    signalId,
    hasFilters: Boolean(searchQuery || changeTypes.length),
    onSearchChange,
    setChangeTypes,
    setPage,
    openSignal,
    closeSignal,
    clearFilters,
  };
};
