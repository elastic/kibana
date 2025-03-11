/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiButton, EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiLoadingLogo } from '@elastic/eui';
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/common';
import { Wrapper } from '../../components/alert_summary/wrapper';
import { DATAVIEW_ERROR } from './translations';
import { useKibana } from '../../../common/lib/kibana';

const dataViewSpec: DataViewSpec = { title: '.alerts-security.alerts-default' };

/**
 *
 */
export const AlertSummaryPage = () => {
  const { data } = useKibana().services;
  const [dataView, setDataView] = useState<DataView>();
  const [showUnifiedComponents, setShowUnifiedComponents] = useState<boolean>(true);

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
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton onClick={() => setShowUnifiedComponents((t) => !t)}>
            {showUnifiedComponents ? 'Show old components' : 'Show unified components'}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <Wrapper dataView={dataView} showUnifiedComponents={showUnifiedComponents} />
    </>
  );
};

AlertSummaryPage.displayName = 'AlertSummaryPage';
