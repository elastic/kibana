/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_ID } from '../../../../../common';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import type { GetFieldsData } from './use_get_fields_data';
import { getField } from '../utils';

export interface UseShowRelatedCasesParams {
  /**
   * Retrieves searchHit values for the provided field
   */
  getFieldsData: GetFieldsData;
}

/**
 * Returns true if the user has read privileges for cases, false otherwise
 */
export const useShowRelatedCases = ({ getFieldsData }: UseShowRelatedCasesParams): boolean => {
  const { cases } = useKibana().services;
  const isAlert = getField(getFieldsData('event.kind')) === 'signal';
  const userCasesPermissions = cases.helpers.canUseCases([APP_ID]);

  return isAlert && userCasesPermissions.read;
};
