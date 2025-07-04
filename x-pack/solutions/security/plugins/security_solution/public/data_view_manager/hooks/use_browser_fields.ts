/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { BrowserFields } from '@kbn/timelines-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import { DataViewManagerScopeName } from '../constants';
import { useDataView } from './use_data_view';
import { browserFieldsManager } from '../utils/security_browser_fields_manager';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';

export const useBrowserFields = (
  scope: DataViewManagerScopeName = DataViewManagerScopeName.default,
  oldDataView?: DataView
): BrowserFields => {
  const { dataView } = useDataView(scope);
  // TODO: When removing, oldDataView should be removed as well and only the scope will be necessary
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const activeDataView = newDataViewPickerEnabled ? dataView : oldDataView;

  return useMemo(() => {
    if (!activeDataView) {
      return {};
    }

    const { browserFields } = browserFieldsManager.getBrowserFields(activeDataView, scope);

    return browserFields;
  }, [activeDataView, scope]);
};
