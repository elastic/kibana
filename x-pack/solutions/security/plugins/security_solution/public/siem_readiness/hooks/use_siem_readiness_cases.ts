/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useKibana } from '../../common/lib/kibana';

interface CaseFlyoutParams {
  title: string;
  description: string;
}

export const useSiemReadinessCases = () => {
  const { services } = useKibana();

  const createNewSiemReadinessCaseFlyout = useCallback(
    ({ title, description }: CaseFlyoutParams) => {
      const caseFlyout = services.cases.hooks.useCasesAddToNewCaseFlyout({
        initialValue: {
          title,
          description,
        },
      });

      caseFlyout.open();
    },
    [services.cases]
  );

  return {
    createNewSiemReadinessCaseFlyout,
  };
};
