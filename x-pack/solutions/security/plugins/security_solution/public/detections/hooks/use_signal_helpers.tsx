/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { UseDataViewReturnValue } from '../../data_view_manager/hooks/use_data_view';
import { useSignalIndexName } from '../../data_view_manager/hooks/use_signal_index_name';

/**
 * Computes whether the signal index still needs to be initialized for the given alerts data view.
 * The alerts data view should be retrieved once via the useDataView hook (with PageScope.alerts)
 * and passed in here, so we avoid an additional useDataView subscription per consumer.
 */
export const useSignalHelpers = (
  dataView: DataView,
  status: UseDataViewReturnValue['status']
): {
  /* when true, signal index has been initiated but does not exist yet */
  signalIndexNeedsInit: boolean;
} => {
  const signalIndexName = useSignalIndexName();

  const defaultDataViewPattern = dataView.getIndexPattern() ?? '';

  const signalIndexNeedsInit = useMemo(() => {
    if (status === 'pristine') {
      return false;
    }
    return !defaultDataViewPattern.includes(`${signalIndexName}`);
  }, [defaultDataViewPattern, signalIndexName, status]);

  return {
    signalIndexNeedsInit,
  };
};
