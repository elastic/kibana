/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSkeletonLoading, EuiSkeletonRectangle, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import { useFetchIntegrations } from '../../hooks/alert_summary/use_fetch_integrations';
import { LandingPage } from '../../components/alert_summary/landing_page/landing_page';

/**
 *
 */
export const AlertSummaryPage = () => {
  const { availableInstalledPackage, installedPackages, isLoading } = useFetchIntegrations();

  return (
    <EuiSkeletonLoading
      isLoading={isLoading}
      loadingContent={
        <div
          css={css`
            margin: auto;
            width: 700px;
          `}
        >
          <EuiSkeletonRectangle height={400} width="100%" />
          <EuiSpacer size="xxl" />
          <EuiSkeletonRectangle height={40} width="100%" />
          <EuiSpacer size="s" />
          <EuiSkeletonRectangle height={20} width="100%" />
          <EuiSpacer size="xl" />
          <EuiSkeletonRectangle height={100} width="100%" />
        </div>
      }
      loadedContent={
        <>
          <LandingPage packages={availableInstalledPackage} />
        </>
        // <>
        //   {installedPackages.length > 0 ? (
        //     <Wrapper packages={availableInstalledPackage} />
        //   ) : (
        //     <LandingPage packages={installedPackages} />
        //   )}
        // </>
      }
    />
  );
};

AlertSummaryPage.displayName = 'AlertSummaryPage';
