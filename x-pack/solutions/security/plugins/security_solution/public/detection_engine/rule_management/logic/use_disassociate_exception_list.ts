/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useRef } from 'react';

import type { List } from '@kbn/securitysolution-io-ts-list-types';
import type { HttpStart } from '@kbn/core/public';
import { patchRule } from '../api/api';

type Func = (lists: List[]) => void;
export type ReturnUseDisassociateExceptionList = [boolean, Func | null];

export interface UseDisassociateExceptionListProps {
  http: HttpStart;
  ruleRuleId: string;
  onError: (arg: Error) => void;
  onSuccess: () => void;
}

/**
 * Hook for removing an exception list reference from a rule
 *
 * @param http Kibana http service
 * @param ruleRuleId a rule_id (NOT id)
 * @param onError error callback
 * @param onSuccess success callback
 *
 */
export const useDisassociateExceptionList = ({
  http,
  ruleRuleId,
  onError,
  onSuccess,
}: UseDisassociateExceptionListProps): ReturnUseDisassociateExceptionList => {
  const [isLoading, setLoading] = useState(false);
  const disassociateList = useRef<Func | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const disassociateListFromRule =
      (id: string) =>
      async (exceptionLists: List[]): Promise<void> => {
        try {
          if (isSubscribed) {
            setLoading(true);

            await patchRule({
              ruleProperties: {
                rule_id: id,
                exceptions_list: exceptionLists,
              },
              signal: abortCtrl.signal,
            });

            onSuccess();
            setLoading(false);
          }
        } catch (err) {
          if (isSubscribed) {
            setLoading(false);
            onError(err);
          }
        }
      };

    disassociateList.current = disassociateListFromRule(ruleRuleId);

    return (): void => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [http, ruleRuleId, onError, onSuccess]);

  return [isLoading, disassociateList.current];
};
