/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiHorizontalRule,
  EuiLoadingLogo,
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dataView, setDataView] = useState<DataView>();
  const [showUnifiedComponents, setShowUnifiedComponents] = useState<boolean>(false); // TODO TEMP: for demo purposes ONLY, toggles between old and unified components

  useEffect(() => {
    let dv: DataView;
    const createDataView = async () => {
      dv = await data.dataViews.create(dataViewSpec);
      setDataView(dv);
      setIsLoading(false);
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
      <EuiButton onClick={() => setShowUnifiedComponents((t) => !t)}>
        {showUnifiedComponents ? 'Show old components' : 'Show unified components'}
      </EuiButton>
      <EuiSkeletonLoading
        isLoading={isLoading}
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
            <IntegrationSection packages={packages} />
            <EuiHorizontalRule />
            <SearchBarSection
              dataView={dataView}
              packages={packages}
              showUnifiedComponents={showUnifiedComponents}
            />
            <EuiSpacer />
            <KPIsSection dataView={dataView} />
            <EuiSpacer />
            <TableSection dataView={dataView} showUnifiedComponents={showUnifiedComponents} />
          </>
        }
      />
    </>
  );
});

Wrapper.displayName = 'Wrapper';
