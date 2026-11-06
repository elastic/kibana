/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationSource } from '../../common/types/applications';
import { useQueryParam } from './use_query_param';

/** Source from the `sourceFilter` URL param, `undefined` for all sources. */
export const useSourceFilter = (): {
  sourceFilter: ApplicationSource | undefined;
  setSourceFilter: (source: ApplicationSource | undefined) => void;
} => {
  const { value: sourceFilter, setValue: setSourceFilter } = useQueryParam('sourceFilter');
  return { sourceFilter, setSourceFilter };
};
