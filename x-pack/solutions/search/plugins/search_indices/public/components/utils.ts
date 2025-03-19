/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generatePath } from 'react-router-dom';

import type { ApplicationStart, HttpSetup } from '@kbn/core/public';
import { INDICES_APP_BASE, SEARCH_INDICES_DETAILS_PATH } from '../routes';

const INDEX_DETAILS_FULL_PATH = `${INDICES_APP_BASE}${SEARCH_INDICES_DETAILS_PATH}`;

function getIndexDetailsPath(http: HttpSetup, indexName: string) {
  return http.basePath.prepend(generatePath(INDEX_DETAILS_FULL_PATH, { indexName }));
}

export const navigateToIndexDetails = (
  application: ApplicationStart,
  http: HttpSetup,
  indexName: string
) => {
  application.navigateToUrl(getIndexDetailsPath(http, indexName));
};
