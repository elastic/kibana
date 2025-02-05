/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ListArray } from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

/**
 * Util to check if linked exceptions include more than one default list
 * @param exceptionLists {array} - exception lists and items to import
 * @returns {Promise} exception lists or error if more than one default list found
 */
export const checkDefaultRuleExceptionListReferences = ({
  exceptionLists,
}: {
  exceptionLists: ListArray | undefined;
}): ListArray | undefined => {
  if (exceptionLists == null) {
    return exceptionLists;
  }

  const defaultLists = exceptionLists.filter(
    (list) => list.type === ExceptionListTypeEnum.RULE_DEFAULT
  );

  // This should hopefully never happen, but could if we forget to add such a check to one
  // of our routes allowing the user to update the rule to have more than one default list added
  if (defaultLists.length > 1) {
    throw new Error('More than one default exception list found on rule');
  } else {
    return exceptionLists;
  }
};
