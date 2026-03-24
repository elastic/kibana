/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchExceptionLists, updateExceptionList } from '@kbn/securitysolution-list-api';

import type { HttpSetup } from '@kbn/core-http-browser';
import { getFilters } from '@kbn/securitysolution-list-utils';
import type { List, ListArray, NamespaceType } from '@kbn/securitysolution-io-ts-list-types';
import { asyncForEach } from '@kbn/std';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import type { Rule } from '@kbn/securitysolution-exception-list-components';
import { ALL_ENDPOINT_ARTIFACT_LIST_IDS } from '../../../common/endpoint/service/artifacts/constants';
import type {
  FetchListById,
  LinkListToRules,
  UnlinkListFromRules,
  UpdateExceptionList,
} from './types';
import {
  findRuleExceptionReferences,
  patchRule,
} from '../../detection_engine/rule_management/api/api';

export const getListById = async ({ id, http }: FetchListById) => {
  try {
    const abortCtrl = new AbortController();
    const filters = getFilters({
      filters: { list_id: id },
      namespaceTypes: ['single', 'agnostic'],
      hideLists: ALL_ENDPOINT_ARTIFACT_LIST_IDS.filter(
        (listId) => listId !== ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id // todo: remove when removing endpoint exceptions from detections pages
      ),
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
/**
 * Fetch all rules that have the given listId in their exceptions_list field
 * @param listId - The id of the list to fetch rules for
 * @returns An array of rules that have the given listId in their exceptions_list field
 */
export const getListRules = async ({
  id,
  listId,
  namespaceType,
}: {
  id: string;
  listId: string;
  namespaceType: NamespaceType;
}): Promise<Rule[]> => {
  try {
    const abortCtrl = new AbortController();
    const { references } = await findRuleExceptionReferences({
      lists: [{ id, listId, namespaceType }],
      signal: abortCtrl.signal,
    });

    const refRecord = references[0];
    if (!refRecord || !refRecord[listId]) {
      return [];
    }

    return refRecord[listId].referenced_rules.map((rule) => ({
      name: rule.name,
      id: rule.id,
      rule_id: rule.rule_id,
      exceptions_list: rule.exception_lists,
    }));
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
