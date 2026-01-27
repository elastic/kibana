/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { BrowserFields } from '@kbn/timelines-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import { PageScope } from '../constants';
import { useDataView } from './use_data_view';
import { buildBrowserFields } from '../utils/build_browser_fields';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';

const emptyFields = {};

export const useBrowserFields = (
  scope: PageScope = PageScope.default,
  /**
   * @deprecated remove when newDataViewPickerEnabled is removed
   */
  oldDataView?: DataView
): BrowserFields => {
  const { dataView } = useDataView(scope);
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const activeDataView = newDataViewPickerEnabled ? dataView : oldDataView;

  return useMemo(() => {
    if (!activeDataView?.id) {
      return emptyFields;
    }

    const browserFields = buildBrowserFields(activeDataView?.fields);

    return browserFields;
  }, [activeDataView]);
};
