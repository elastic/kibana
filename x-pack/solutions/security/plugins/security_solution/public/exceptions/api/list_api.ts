/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchExceptionLists, updateExceptionList } from '@kbn/securitysolution-list-api';

import type { HttpSetup } from '@kbn/core-http-browser';
import { getFilters } from '@kbn/securitysolution-list-utils';
import type { List, ListArray } from '@kbn/securitysolution-io-ts-list-types';
import { asyncForEach } from '@kbn/std';
import { ALL_ENDPOINT_ARTIFACT_LIST_IDS } from '../../../common/endpoint/service/artifacts/constants';
import type {
  FetchListById,
  LinkListToRules,
  UnlinkListFromRules,
  UpdateExceptionList,
} from './types';
import { fetchRules, patchRule } from '../../detection_engine/rule_management/api/api';
import type { Rule } from '../../detection_engine/rule_management/logic';

export const getListById = async ({ id, http }: FetchListById) => {
  try {
    const abortCtrl = new AbortController();
    const filters = getFilters({
      filters: { list_id: id },
      namespaceTypes: ['single', 'agnostic'],
      hideLists: ALL_ENDPOINT_ARTIFACT_LIST_IDS,
    });
    const namespaceTypes = ['single', 'agnostic'].join();

    const { data } = await fetchExceptionLists({
      filters,
      http: http as HttpSetup,
      signal: abortCtrl.signal,
      namespaceTypes,
      pagination: {},
    });
    abortCtrl.abort();

    if (data && data.length) return data[0];
    return null;
  } catch (error) {
    throw new Error(error);
  }
};
export const getListRules = async (listId: string) => {
  try {
    const abortCtrl = new AbortController();
    const { data: rules } = await fetchRules({
      signal: abortCtrl.signal,
      pagination: {
        page: 1,
        perPage: 10000,
      },
    });
    abortCtrl.abort();
    return rules.reduce((acc: Rule[], rule, index) => {
      const listExceptions = rule.exceptions_list?.find(
        (exceptionList) => exceptionList.list_id === listId
      );
      if (listExceptions) acc.push(rule);
      return acc;
    }, []);
  } catch (error) {
    throw new Error(error);
  }
};

export const updateList = async ({ list, http }: UpdateExceptionList) => {
  try {
    const abortCtrl = new AbortController();
    await updateExceptionList({
      http: http as HttpSetup,
      list,
      signal: abortCtrl.signal,
    });
    abortCtrl.abort();
  } catch (error) {
    throw new Error(error);
  }
};

export const unlinkListFromRules = async ({ rules, listId }: UnlinkListFromRules) => {
  try {
    if (!rules.length) return;
    const abortCtrl = new AbortController();
    await asyncForEach(rules, async (rule) => {
      const exceptionLists: ListArray | [] = (rule.exceptions_list ?? []).filter(
        ({ list_id: id }) => id !== listId
      );
      await patchRule({
        ruleProperties: {
          rule_id: rule.rule_id,
          exceptions_list: exceptionLists,
        },
        signal: abortCtrl.signal,
      });
    });
  } catch (error) {
    throw new Error(error);
  }
};

export const linkListToRules = async ({
  rules,
  listId,
  id,
  listType,
  listNamespaceType,
}: LinkListToRules) => {
  try {
    if (!rules.length) return;
    const abortCtrl = new AbortController();
    await asyncForEach(rules, async (rule) => {
      const newExceptionList: List = {
        list_id: listId,
        id,
        type: listType,
        namespace_type: listNamespaceType,
      };
      const exceptionLists: ListArray | [] = [...(rule.exceptions_list ?? []), newExceptionList];
      await patchRule({
        ruleProperties: {
          rule_id: rule.rule_id,
          exceptions_list: exceptionLists,
        },
        signal: abortCtrl.signal,
      });
    });
  } catch (error) {
    throw new Error(error);
  }
};
