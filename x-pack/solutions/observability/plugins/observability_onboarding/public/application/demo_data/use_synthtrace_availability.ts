/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { HttpStart } from '@kbn/core/public';
import { checkSynthtraceAvailability } from './api';

export const useSynthtraceAvailability = (http: HttpStart): boolean => {
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    let ignore = false;

    checkSynthtraceAvailability(http).then((available) => {
      if (!ignore) {
        setIsAvailable(available);
      }
    });

    return () => {
      ignore = true;
    };
  }, [http]);

  return isAvailable;
};
