/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { GlobalFilter, StartPlugins } from '../types';

export const useLastUpdated = (globalFilter: GlobalFilter) => {
  const { timelines: timelinesUi } = useKibana<CoreStart & StartPlugins>().services;

  // Only reset updated at on refresh or after globalFilter gets updated
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const updatedAt = useMemo(() => Date.now(), [globalFilter]);

  return timelinesUi.getLastUpdated({
    updatedAt: updatedAt || Date.now(),
  });
};
