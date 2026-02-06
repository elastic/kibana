/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useAlertPrefillContext } from '../../../../alerting/use_alert_prefill';
import { useSourceContext } from '../../../../containers/metrics_source';
import { useSnapshot } from '../hooks/use_snaphot';
import { useWaffleFiltersContext } from '../hooks/use_waffle_filters';
import { useWaffleOptionsContext } from '../hooks/use_waffle_options';
import { useWaffleTimeContext } from '../hooks/use_waffle_time';
import { FilterBar } from './filter_bar';
import { LayoutView } from './layout_view';

export const SnapshotContainer = React.memo(function SnapshotContainer() {
  const { sourceId } = useSourceContext();
  const { metric, groupBy, nodeType, accountId, region, preferredSchema } =
    useWaffleOptionsContext();
  const { currentTime } = useWaffleTimeContext();
  const { filterQuery } = useWaffleFiltersContext();

  const { inventoryPrefill } = useAlertPrefillContext();

  useEffect(() => {
    return () => inventoryPrefill.reset();
  }, [inventoryPrefill]);

  const {
    loading,
    nodes,
    interval = '60s',
  } = useSnapshot(
    {
      kuery: filterQuery.query,
      metrics: [metric],
      groupBy,
      nodeType,
      sourceId,
      currentTime,
      accountId,
      region,
      schema: preferredSchema,
    },
    { sendRequestImmediately: true }
  );

  return (
    <>
      <FilterBar interval={interval} />
      <LayoutView loading={loading} nodes={nodes} interval={interval} />
    </>
  );
});
