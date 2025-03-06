/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiHorizontalRule, EuiSpacer, EuiEmptyPrompt, EuiLoadingLogo } from '@elastic/eui';
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/common';
import { DATAVIEW_ERROR } from './translations';
import { useKibana } from '../../../common/lib/kibana';
import { KPIsSection } from '../../components/alert_summary/kpis/kpis_section';
import { SearchBarSection } from '../../components/alert_summary/search_bar/search_bar_section';
import { TableSection } from '../../components/alert_summary/table/table_section';
import { IntegrationSection } from '../../components/alert_summary/integrations/integration_section';

const dataViewSpec: DataViewSpec = { title: '.alerts-security.alerts-default' };

/**
 *
 */
export const AlertSummaryPage = () => {
  const { data } = useKibana().services;
  const [dataView, setDataView] = useState<DataView>();

  useEffect(() => {
    let dv: DataView;
    const createDataView = async () => {
      dv = await data.dataViews.create(dataViewSpec);
      setDataView(dv);
    };
    createDataView();

    // clearing after leaving the page //TODO do we need to do that if the data discovery page is using the same??
    return () => {
      if (dv?.id) {
        data.dataViews.clearInstanceCache(dv?.id);
      }
    };
  }, [data.dataViews]);

  if (!dataView) {
    return <EuiEmptyPrompt icon={<EuiLoadingLogo logo="logoKibana" size="xl" />} />;
  }

  if (!dataView.id) {
    return <EuiEmptyPrompt iconType="error" color="danger" title={<h2>{DATAVIEW_ERROR}</h2>} />;
  }

  return (
    <>
      <IntegrationSection />
      <EuiHorizontalRule />
      <SearchBarSection dataView={dataView} />
      <EuiSpacer />
      <KPIsSection dataView={dataView} />
      <EuiSpacer />
      <TableSection dataView={dataView} />
    </>
  );
};

AlertSummaryPage.displayName = 'AlertSummaryPage';
