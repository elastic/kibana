/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useState } from 'react';
import {
  EuiEmptyPrompt,
  EuiHorizontalRule,
  EuiSkeletonLoading,
  EuiSkeletonRectangle,
  EuiSpacer,
} from '@elastic/eui';
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/common';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { DATAVIEW_ERROR } from '../../pages/alert_summary/translations';
import { useKibana } from '../../../common/lib/kibana';
import { IntegrationSection } from './integrations/integration_section';
import { SearchBarSection } from './search_bar/search_bar_section';
import { TableSection } from './table/table_section';
import { KPIsSection } from './kpis/kpis_section';

export const DATA_VIEW_LOADING_PROMPT = 'alert-summary-data-view-loading-prompt';

const dataViewSpec: DataViewSpec = { title: '.alerts-security.alerts-default' };

export interface WrapperProps {
  /**
   *
   */
  packages: PackageListItem[];
}

/**
 *
 */
export const Wrapper = memo(({ packages }: WrapperProps) => {
  const { data } = useKibana().services;
  const [dataView, setDataView] = useState<DataView | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let dv: DataView;
    const createDataView = async () => {
      dv = await data.dataViews.create(dataViewSpec);
      setDataView(dv);
      setLoading(false);
    };
    createDataView();

    // clearing after leaving the page //TODO do we need to do that if the data discovery page is using the same??
    return () => {
      if (dv?.id) {
        data.dataViews.clearInstanceCache(dv?.id);
      }
    };
  }, [data.dataViews]);

  return (
    <EuiSkeletonLoading
      data-test-subj={DATA_VIEW_LOADING_PROMPT}
      isLoading={loading}
      loadingContent={
        <>
          <EuiSkeletonRectangle height={50} width="100%" />
          <EuiHorizontalRule />
          <EuiSkeletonRectangle height={50} width="100%" />
          <EuiSpacer />
          <EuiSkeletonRectangle height={275} width="100%" />
          <EuiSpacer />
          <EuiSkeletonRectangle height={600} width="100%" />
        </>
      }
      loadedContent={
        <>
          {!dataView || !dataView.id ? (
            <EuiEmptyPrompt iconType="error" color="danger" title={<h2>{DATAVIEW_ERROR}</h2>} />
          ) : (
            <>
              <IntegrationSection packages={packages} />
              <EuiHorizontalRule />
              <SearchBarSection dataView={dataView} packages={packages} />
              <EuiSpacer />
              <KPIsSection dataView={dataView} />
              <EuiSpacer />
              <TableSection dataView={dataView} />
            </>
          )}
        </>
      }
    />
  );
});

Wrapper.displayName = 'Wrapper';
