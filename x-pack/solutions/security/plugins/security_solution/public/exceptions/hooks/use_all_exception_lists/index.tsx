/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';

import type { ExceptionListSchema, ListArray } from '@kbn/securitysolution-io-ts-list-types';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { findRuleExceptionReferences } from '../../../detection_engine/rule_management/api/api';

export interface ExceptionListRuleReference {
  name: string;
  id: string;
  rule_id: string;
  exceptions_list: ListArray;
}

export interface ExceptionListInfo extends ExceptionListSchema {
  rules: ExceptionListRuleReference[];
}

export type UseAllExceptionListsReturn = [
  boolean,
  ExceptionListInfo[],
  Record<string, ExceptionListInfo>
];

/**
 * Hook for preparing exception lists table info. Uses the server-side
 * _find_references endpoint to query rules by exception list reference
 * via Elasticsearch hasReference, instead of loading all rules client-side.
 *
 * @param exceptionLists ExceptionListSchema(s) to evaluate
 */
export const useAllExceptionLists = ({
  exceptionLists,
}: {
  exceptionLists: ExceptionListSchema[];
}): UseAllExceptionListsReturn => {
  const [loading, setLoading] = useState(true);
  const [exceptions, setExceptions] = useState<ExceptionListInfo[]>([]);
  const [exceptionsListsInfo, setExceptionsListInfo] = useState<Record<string, ExceptionListInfo>>(
    {}
  );
  const { read: canReadRules } = useUserPrivileges().rulesPrivileges.rules;

  const listKey = useMemo(() => exceptionLists.map((l) => l.id).join(','), [exceptionLists]);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchData = async (): Promise<void> => {
      if (exceptionLists.length === 0 && isSubscribed) {
        setLoading(false);
        setExceptions([]);
        setExceptionsListInfo({});
        return;
      }

      try {
        setLoading(true);

        const listsById = exceptionLists.reduce<Record<string, ExceptionListInfo>>((acc, list) => {
          acc[list.id] = { ...list, rules: [] };
          return acc;
        }, {});

        if (canReadRules) {
          const { references } = await findRuleExceptionReferences({
            lists: exceptionLists.map((list) => ({
              id: list.id,
              listId: list.list_id,
              namespaceType: list.namespace_type,
            })),
            signal: abortCtrl.signal,
          });

          for (const refRecord of references) {
            for (const [, refData] of Object.entries(refRecord)) {
              if (listsById[refData.id]) {
                listsById[refData.id].rules = refData.referenced_rules.map((rule) => ({
                  name: rule.name,
                  id: rule.id,
                  rule_id: rule.rule_id,
                  exceptions_list: rule.exception_lists,
                }));
              }
            }
          }
        }

        if (isSubscribed) {
          setExceptions(Object.values(listsById));
          setExceptionsListInfo(listsById);
          setLoading(false);
        }
      } catch (error) {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return (): void => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [canReadRules, listKey, exceptionLists]);

  return [loading, exceptions, exceptionsListsInfo];
};
