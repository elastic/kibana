/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { useTimeRangeMetadataContext } from '../../../../../hooks/use_timerange_metadata';
import { RenderDashboard } from '../dashboard/render_dashboard';
import { EntityTable } from '../entity_table/entity_table';

export const PageContent = ({
  dashboardId,
  enitiyId,
}: {
  dashboardId: string;
  enitiyId?: string | null;
}) => {
  const { data, status } = useTimeRangeMetadataContext();

  if (status === 'loading') {
    return <EuiLoadingSpinner size="xl" />;
  }

  if (data?.schemas === undefined) {
    return null;
  }

  return (
    <>
      {enitiyId ? <EntityTable entityId={enitiyId} /> : null}
      <RenderDashboard dashboardId={dashboardId} />
    </>
  );
};
