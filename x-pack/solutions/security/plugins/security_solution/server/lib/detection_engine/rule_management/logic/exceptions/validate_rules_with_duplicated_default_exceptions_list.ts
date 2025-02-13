/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import type { ListArray } from '@kbn/securitysolution-io-ts-list-types';

import type {
  BulkCreateRulesRequestBody,
  BulkPatchRulesRequestBody,
  BulkUpdateRulesRequestBody,
} from '../../../../../../common/api/detection_engine/rule_management';
import { CustomHttpRequestError } from '../../../../../utils/custom_http_request_error';
/**
 * Check if rule has duplicated default exceptions lits
 */
export const validateRulesWithDuplicatedDefaultExceptionsList = ({
  exceptionsList,
  allRules,
  ruleId,
}: {
  allRules: BulkCreateRulesRequestBody | BulkPatchRulesRequestBody | BulkUpdateRulesRequestBody;
  exceptionsList: ListArray | undefined;
  ruleId: string | undefined;
}): void => {
  if (!exceptionsList) return;
  const defaultExceptionToTuRulesMap: { [key: string]: number[] } = {};

  allRules.forEach((rule, ruleIndex) => {
    rule.exceptions_list?.forEach((list) => {
      if (list.type === ExceptionListTypeEnum.RULE_DEFAULT) {
        defaultExceptionToTuRulesMap[list.id] ??= [];
        defaultExceptionToTuRulesMap[list.id].push(ruleIndex);
      }
    });
  });

  const duplicatedExceptionsList =
    exceptionsList
      ?.filter((list) => list.type === ExceptionListTypeEnum.RULE_DEFAULT)
      ?.filter((list) => defaultExceptionToTuRulesMap[list.id]?.length > 1) ?? [];

  if (duplicatedExceptionsList.length > 0) {
    const ids = duplicatedExceptionsList?.map((list) => list.id).join(', ');
    throw new CustomHttpRequestError(
      `default exceptions list ${ids}${ruleId ? ` for rule ${ruleId}` : ''} is duplicated`,
      409
    );
  }
};
