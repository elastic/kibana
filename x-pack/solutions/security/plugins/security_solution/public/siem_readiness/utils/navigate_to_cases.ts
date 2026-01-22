/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';

export const navigateToCasesWithTagsFilter = (basePath: string, tags: string[]) => {
  const filterParams = {
    tags,
  };
  const encodedFilterParams = encodeURIComponent(encode(filterParams));
  const casesUrl = `${basePath}/app/security/cases?cases=${encodedFilterParams}`;
  window.open(casesUrl, '_blank', 'noopener,noreferrer');
};
