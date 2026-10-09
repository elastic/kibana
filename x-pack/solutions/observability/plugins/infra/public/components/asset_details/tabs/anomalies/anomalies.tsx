/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useRef } from 'react';
import { AnomaliesTable } from '../../../ml/anomaly_detection/anomalies_table/anomalies_table';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { useDatePickerContext } from '../../hooks/use_date_picker';
import { useRequestObservable } from '../../hooks/use_request_observable';
import { useTabSwitcherContext } from '../../hooks/use_tab_switcher';

export const Anomalies = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { isActiveTab } = useTabSwitcherContext();
  const { request$ } = useRequestObservable();
  const { getParsedDateRange } = useDatePickerContext();
  const { entity } = useAssetDetailsRenderPropsContext();
  const parsedDateRange = useMemo(() => getParsedDateRange(), [getParsedDateRange]);

  return (
    <div ref={ref}>
      <AnomaliesTable
        hostName={entity.name}
        dateRange={parsedDateRange}
        hideDatePicker
        fetcherOpts={{
          autoFetch: isActiveTab('anomalies'),
          requestObservable$: request$,
        }}
      />
    </div>
  );
};
