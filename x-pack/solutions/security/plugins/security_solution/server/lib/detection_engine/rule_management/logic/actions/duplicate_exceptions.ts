/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { ExceptionListClient } from '@kbn/lists-plugin/server';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

import type { RuleParams } from '../../../rule_schema';

const ERROR_DUPLICATING = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.cloneExceptions.errorDuplicatingList',
  {
    defaultMessage:
      'Unable to duplicate rule default exceptions - unable to find their container with list_id:',
  }
);

const ERROR_DUPLICATING_ITEMS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.cloneExceptions.errorDuplicatingListItems',
  {
    defaultMessage: 'Unable to duplicate rule default exception items for rule_id:',
  }
);

interface DuplicateExceptionsParams {
  ruleId: RuleParams['ruleId'];
  exceptionLists: RuleParams['exceptionsList'];
  exceptionsClient: ExceptionListClient | undefined;
  includeExpiredExceptions: boolean;
}

export const duplicateExceptions = async ({
  ruleId,
  exceptionLists,
  exceptionsClient,
  includeExpiredExceptions,
}: DuplicateExceptionsParams): Promise<RuleParams['exceptionsList']> => {
  if (exceptionLists == null || !exceptionLists.length) {
    return [];
  }

  // Sort the shared lists and the rule_default lists.
  // Only a single rule_default list should exist per rule.
  const ruleDefaultList = exceptionLists.find(
    (list) => list.type === ExceptionListTypeEnum.RULE_DEFAULT
  );
  const sharedLists = exceptionLists.filter(
    (list) => list.type !== ExceptionListTypeEnum.RULE_DEFAULT
  );

  // For rule_default list (exceptions that live only on a single rule), we need
  // to create a new rule_default list to assign to duplicated rule
  if (ruleDefaultList != null && exceptionsClient != null) {
    // fetch list container
    const listToDuplicate = await exceptionsClient.getExceptionList({
      id: undefined,
      listId: ruleDefaultList.list_id,
      namespaceType: ruleDefaultList.namespace_type,
    });

    if (listToDuplicate == null) {
      throw new Error(`${ERROR_DUPLICATING} "${ruleDefaultList.list_id}"`);
    } else {
      const ruleDefaultExceptionList = await exceptionsClient.duplicateExceptionListAndItems({
        list: listToDuplicate,
        namespaceType: ruleDefaultList.namespace_type,
        includeExpiredExceptions,
      });

      if (ruleDefaultExceptionList == null) {
        throw new Error(`${ERROR_DUPLICATING_ITEMS} ${ruleId}`);
      }

      return [
        ...sharedLists,
        {
          id: ruleDefaultExceptionList.id,
          list_id: ruleDefaultExceptionList.list_id,
          namespace_type: ruleDefaultExceptionList.namespace_type,
          type: ruleDefaultExceptionList.type,
        },
      ];
    }
  }

  // If no rule_default list exists, we can just return
  return [...sharedLists];
};
