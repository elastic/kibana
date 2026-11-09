/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { pick } from 'lodash';
import { SHARED_FILTER_NAMES } from '../utils/overview_filters_query';
import { useDigitalExperienceParams } from './use_digital_experience_params';

/**
 * The filters of the Overview that the Sessions list has too (`browser`, `os` and `country`),
 * for links between the two tabs. Only the ones set are returned: the router removes empty and
 * invalid values from the URL.
 */
export const useSharedFilters = () => {
  const { query } = useDigitalExperienceParams('/');

  return useMemo(() => pick(query, SHARED_FILTER_NAMES), [query]);
};
