/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { BrowserFields } from '@kbn/timelines-plugin/common';
import { DataViewManagerScopeName } from '../constants';
import { useDataView } from './use_data_view';
import { browserFieldsManager } from '../utils/security_browser_fields_manager';

export const useBrowserFields = (
  scope: DataViewManagerScopeName = DataViewManagerScopeName.default
): BrowserFields => {
  const { dataView } = useDataView(scope);

  return useMemo(() => {
    if (!dataView) {
      return {};
    }

    const { browserFields } = browserFieldsManager.getBrowserFields(dataView, scope);

    return browserFields;
  }, [dataView, scope]);
};
