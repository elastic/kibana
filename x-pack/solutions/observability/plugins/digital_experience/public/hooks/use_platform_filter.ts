/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationPlatform } from '../../common/types/applications';
import { useQueryParam } from './use_query_param';

/** Platform from the `platformFilter` URL param, `undefined` for all platforms. */
export const usePlatformFilter = (): {
  platformFilter: ApplicationPlatform | undefined;
  setPlatformFilter: (platform: ApplicationPlatform | undefined) => void;
} => {
  const { value: platformFilter, setValue: setPlatformFilter } = useQueryParam('platformFilter');
  return { platformFilter, setPlatformFilter };
};
