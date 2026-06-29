/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import { KibanaServices } from '../../../../../common/lib/kibana';
import { getEnvironmentContext, type EnvironmentContext } from '../helpers/get_environment_context';

/**
 * Resolves privacy-safe environment context (Kibana version, space ID) once on
 * mount and returns it for use in diagnostic and troubleshooting components.
 */
export const useEnvironmentContext = (
  spaces:
    | {
        getActiveSpace: () => Promise<{ id: string }>;
      }
    | undefined
): EnvironmentContext | undefined => {
  const [environmentContext, setEnvironmentContext] = useState<EnvironmentContext | undefined>(
    undefined
  );

  useEffect(() => {
    let cancelled = false;

    const fetchContext = async () => {
      const ctx = await getEnvironmentContext({
        kibanaVersion: KibanaServices.getKibanaVersion(),
        spaces,
      });

      if (!cancelled) {
        setEnvironmentContext(ctx);
      }
    };

    fetchContext();

    return () => {
      cancelled = true;
    };
  }, [spaces]);

  return environmentContext;
};
