/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMaxSignalsWarning, addToSearchAfterReturn } from './utils';
import type { SearchAfterAndBulkCreateParams, SearchAfterAndBulkCreateReturnType } from '../types';
import type { SearchAfterAndBulkCreateFactoryParams } from './search_after_bulk_create_factory';
import { searchAfterAndBulkCreateFactory } from './search_after_bulk_create_factory';
import { bulkCreate, wrapHits } from '../factories';

// search_after through documents and re-index using bulk endpoint.
export const searchAfterAndBulkCreate = async (
  params: SearchAfterAndBulkCreateParams
): Promise<SearchAfterAndBulkCreateReturnType> => {
  const { sharedParams, services, buildReasonMessage } = params;

  const bulkCreateExecutor: SearchAfterAndBulkCreateFactoryParams['bulkCreateExecutor'] = async ({
    enrichedEvents,
    toReturn,
  }) => {
    const wrappedDocs = wrapHits(sharedParams, enrichedEvents, buildReasonMessage);

    const bulkCreateResult = await bulkCreate({
      wrappedAlerts: wrappedDocs,
      sharedParams,
      services,
      maxAlerts: sharedParams.tuple.maxSignals - toReturn.createdSignalsCount,
    });
    addToSearchAfterReturn({ current: toReturn, next: bulkCreateResult });
    return bulkCreateResult;
  };

  return searchAfterAndBulkCreateFactory({
    ...params,
    bulkCreateExecutor,
    getWarningMessage: getMaxSignalsWarning,
  });
};
