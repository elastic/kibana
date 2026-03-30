/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import { EventKind } from '../../document/constants/event_kinds';
import { APP_ID } from '../../../../common';
import { useKibana } from '../../../common/lib/kibana/kibana_react';

export interface UseShowRelatedCasesParams {
  /**
   * The alert or event document
   */
  hit: DataTableRecord;
}

/**
 * Returns true if the user has read privileges for cases, false otherwise
 */
export const useShowRelatedCases = ({ hit }: UseShowRelatedCasesParams): boolean => {
  const { cases } = useKibana().services;
  const isAlert = getFieldValue(hit, EVENT_KIND) === EventKind.signal;
  const userCasesPermissions = cases.helpers.canUseCases([APP_ID]);

  return isAlert && userCasesPermissions.read;
};
