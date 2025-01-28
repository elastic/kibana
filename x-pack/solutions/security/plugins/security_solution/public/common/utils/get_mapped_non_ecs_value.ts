/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineNonEcsData } from '@kbn/timelines-plugin/common';
import { useMemo } from 'react';

export const getMappedNonEcsValue = ({
  data,
  fieldName,
}: {
  data?: TimelineNonEcsData[];
  fieldName: string;
}): string[] | undefined => {
  /*
   While data _should_ always be defined
   There is the potential for race conditions where a component using this function
   is still visible in the UI, while the data has since been removed.
   To cover all scenarios where this happens we'll check for the presence of data here
  */
  if (!data || data.length === 0) return undefined;
  const item = data.find((d) => d.field === fieldName);
  if (item != null && item.value != null) {
    return item.value;
  }
  return undefined;
};

export const useGetMappedNonEcsValue = ({
  data,
  fieldName,
}: {
  data?: TimelineNonEcsData[];
  fieldName: string;
}): string[] | undefined => {
  return useMemo(() => getMappedNonEcsValue({ data, fieldName }), [data, fieldName]);
};
