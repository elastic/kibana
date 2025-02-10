/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { listenerMiddleware } from '../store/middleware';
import { useKibana } from '../../common/lib/kibana';

export const useSourcererActionListeners = () => {
  const {
    data: { dataViews },
  } = useKibana().services;

  useEffect(() => {
    const sourcererActionListener = {
      predicate: () => true,
      effect: (action, store) => {
        const state = store.getState();

        console.log('sourcererActionListener', action, state);
      },
    };

    listenerMiddleware.startListening(sourcererActionListener);

    return () => {
      listenerMiddleware.stopListening(sourcererActionListener);
    };
  }, []);
};
