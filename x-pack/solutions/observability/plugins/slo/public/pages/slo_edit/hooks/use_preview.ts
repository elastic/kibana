/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Indicator } from '@kbn/slo-schema';
import { debounce } from 'lodash';
import { useCallback, useEffect, useState } from 'react';
import { useGetPreviewData } from '../../../hooks/use_get_preview_data';

export function useDebouncedGetPreviewData({
  isIndicatorValid,
  indicator,
  range,
  groupBy,
  projectRoutings,
}: {
  isIndicatorValid: boolean;
  indicator: Indicator;
  range: { from: Date; to: Date };
  groupBy?: string | string[];
  projectRoutings?: string | null;
}) {
  const serializedIndicator = JSON.stringify(indicator);
  const [indicatorState, setIndicatorState] = useState<string>(serializedIndicator);

  const serializedGroupBy = JSON.stringify([groupBy].flat());
  const [groupByState, setGroupByState] = useState<string>(serializedGroupBy);

  const [projectRoutingsState, setProjectRoutingsState] = useState(projectRoutings);

  // Empty deps intentional: debounce must be stable across renders so the pending timer is not
  // discarded on re-render. The setState setters are guaranteed stable by React.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const store = useCallback(
    debounce((value: string) => setIndicatorState(value), 800),
    []
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const storeGroupBy = useCallback(
    debounce((value: string) => setGroupByState(value), 800),
    []
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const storeProjectRoutings = useCallback(
    debounce((value?: string | null) => setProjectRoutingsState(value), 800),
    []
  );

  useEffect(() => {
    if (indicatorState !== serializedIndicator) {
      store(serializedIndicator);
    }
  }, [indicatorState, serializedIndicator, store]);

  useEffect(() => {
    if (groupByState !== serializedGroupBy) {
      storeGroupBy(serializedGroupBy);
    }
  }, [groupByState, serializedGroupBy, storeGroupBy]);

  useEffect(() => {
    if (projectRoutingsState !== projectRoutings) {
      storeProjectRoutings(projectRoutings);
    }
  }, [projectRoutingsState, projectRoutings, storeProjectRoutings]);

  return useGetPreviewData({
    isValid: isIndicatorValid,
    indicator: JSON.parse(indicatorState),
    range,
    groupBy: JSON.parse(groupByState),
    projectRoutings: projectRoutingsState,
  });
}
