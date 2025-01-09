/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthorFilter, StatusFilter } from '../../../../../common/siem_migrations/constants';
import type { FilterOptions } from './filters';

export const convertFilterOptions = (filterOptions?: FilterOptions) => {
  return {
    ...(filterOptions?.author === AuthorFilter.ELASTIC ? { isPrebuilt: true } : {}),
    ...(filterOptions?.author === AuthorFilter.CUSTOM ? { isPrebuilt: false } : {}),
    ...(filterOptions?.status === StatusFilter.FAILED ? { isFailed: true } : {}),
    ...(filterOptions?.status === StatusFilter.INSTALLED ? { isInstalled: true } : {}),
    ...(filterOptions?.status === StatusFilter.TRANSLATED
      ? { isInstalled: false, isFullyTranslated: true }
      : {}),
    ...(filterOptions?.status === StatusFilter.PARTIALLY_TRANSLATED
      ? { isPartiallyTranslated: true }
      : {}),
    ...(filterOptions?.status === StatusFilter.UNTRANSLATABLE ? { isUntranslatable: true } : {}),
  };
};
