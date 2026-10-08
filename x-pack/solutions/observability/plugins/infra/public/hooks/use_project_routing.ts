/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { of } from 'rxjs';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CPSPluginStart } from '@kbn/cps/public';
import type { ProjectRouting } from '@kbn/es-query';

/**
 * The active CPS (cross-project search) scope, re-rendering when the user
 * changes the project picker. `undefined` when CPS is unavailable or disabled.
 */
export const useProjectRouting = (): ProjectRouting | undefined => {
  const { services } = useKibana<{ cps?: CPSPluginStart }>();
  const cpsManager = services.cps?.cpsManager;
  return useObservable(
    useMemo(() => cpsManager?.getProjectRouting$() ?? of(undefined), [cpsManager]),
    cpsManager?.getProjectRouting()
  );
};
