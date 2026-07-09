/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { BrowserFields } from '@kbn/timelines-plugin/common';
import { PageScope } from '../constants';
import { useDataView } from './use_data_view';
import { buildBrowserFields } from '../utils/build_browser_fields';

const emptyFields = {} as BrowserFields;

export const useBrowserFields = (scope: PageScope = PageScope.default): BrowserFields => {
  const { dataView } = useDataView(scope);

  return useMemo(() => {
    if (!dataView?.id) {
      return emptyFields;
    }

    return buildBrowserFields(dataView?.fields);
  }, [dataView]);
};
