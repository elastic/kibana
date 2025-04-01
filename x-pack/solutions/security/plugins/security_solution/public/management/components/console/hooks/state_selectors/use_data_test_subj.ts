/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useConsoleStore } from '../../components/console_state/console_state';

/**
 * Returns the `data-test-subj` that was defined when the `Console` was rendered.
 * Can optionally set a suffix on that value if one is provided
 */
export const useDataTestSubj = (suffix: string = ''): string => {
  const dataTestSubj = useConsoleStore().state.dataTestSubj;

  if (!dataTestSubj) {
    return '';
  }

  return dataTestSubj + (suffix ? `-${suffix}` : '');
};
