/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useInspectorContext } from '@kbn/observability-shared-plugin/public';
import { setUxAddInspectorRequest } from '../../../../services/rest/ux_inspect';

/** Bind rum/session HTTP helpers to the current inspector adapter. */
export const UxInspectBridge = (): null => {
  const { addInspectorRequest } = useInspectorContext();

  useEffect(() => {
    setUxAddInspectorRequest(addInspectorRequest);
    return () => {
      setUxAddInspectorRequest(undefined);
    };
  }, [addInspectorRequest]);

  return null;
};
