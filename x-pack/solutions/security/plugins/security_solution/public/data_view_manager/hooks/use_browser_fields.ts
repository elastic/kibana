/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { BrowserFields } from '@kbn/timelines-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/public';
import { buildBrowserFields } from '@kbn/data-view-manager';

const emptyFields = {} as BrowserFields;

/**
 * Returns the BrowserFields map for the provided dataView.
 * The dataView should be retrieved once via the useDataView hook and passed in here.
 */
export const useBrowserFields = (dataView: DataView): BrowserFields => {
  return useMemo(() => {
    if (!dataView?.id) {
      return emptyFields;
    }

    return buildBrowserFields(dataView.fields);
  }, [dataView]);
};
