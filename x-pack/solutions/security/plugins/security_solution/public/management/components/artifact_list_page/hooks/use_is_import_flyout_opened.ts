/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useUrlParams } from '../../../hooks/use_url_params';
import type { ArtifactListPageUrlParams } from '../types';

export const useIsImportFlyoutOpened = (allowCreate: boolean = true): boolean => {
  const showUrlParamValue = useUrlParams<ArtifactListPageUrlParams>().urlParams.show ?? '';
  return useMemo(
    () => showUrlParamValue === 'import' && allowCreate,

    [allowCreate, showUrlParamValue]
  );
};
