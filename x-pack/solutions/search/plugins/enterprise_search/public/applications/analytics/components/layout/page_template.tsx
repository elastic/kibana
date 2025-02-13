/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';

import { useValues } from 'kea';

import useObservable from 'react-use/lib/useObservable';

import type { EuiSideNavItemTypeEnhanced } from '@kbn/core-chrome-browser';

import { SEARCH_PRODUCT_NAME } from '../../../../../common/constants';
import { generateEncodedPath } from '../../../shared/encode_path_params';
import { KibanaLogic } from '../../../shared/kibana';
import { SetAnalyticsChrome } from '../../../shared/kibana_chrome';
import { EnterpriseSearchPageTemplateWrapper, PageTemplateProps } from '../../../shared/layout';
import { useEnterpriseSearchAnalyticsNav } from '../../../shared/layout/nav';
import { SendEnterpriseSearchTelemetry } from '../../../shared/telemetry';
import {
  COLLECTION_EXPLORER_PATH,
  COLLECTION_INTEGRATE_PATH,
  COLLECTION_OVERVIEW_PATH,
} from '../../routes';

interface EnterpriseSearchAnalyticsPageTemplateProps extends PageTemplateProps {
  analyticsName?: string;
}

export const EnterpriseSearchAnalyticsPageTemplate: React.FC<
  EnterpriseSearchAnalyticsPageTemplateProps
> = ({ children, analyticsName, pageChrome, pageViewTelemetry, ...pageTemplateProps }) => {
  const { updateSideNavDefinition, getChromeStyle$ } = useValues(KibanaLogic);
  const chromeStyle = useObservable(getChromeStyle$(), 'classic');
  const alwaysReturnNavItems = true;

  const navItems = useEnterpriseSearchAnalyticsNav(
    analyticsName,
    analyticsName
      ? {
          explorer: generateEncodedPath(COLLECTION_EXPLORER_PATH, {
            name: analyticsName,
          }),
          integration: generateEncodedPath(COLLECTION_INTEGRATE_PATH, {
            name: analyticsName,
          }),
          overview: generateEncodedPath(COLLECTION_OVERVIEW_PATH, {
            name: analyticsName,
          }),
        }
      : undefined,
    alwaysReturnNavItems
  );

  const getSelectedCollectionItems = useCallback(
    (
      items?: Array<EuiSideNavItemTypeEnhanced<unknown>>
    ): Array<EuiSideNavItemTypeEnhanced<unknown>> | undefined => {
      if (!items) return undefined;

      const buildGroup = items.find((item) => item.id === 'build');
      if (!buildGroup || !buildGroup.items) return undefined;

      const searchAppsGroup = buildGroup.items.find((item) => item.id === 'analyticsCollections');

      return searchAppsGroup?.items;
    },
    []
  );

  useEffect(() => {
    // We update the new side nav definition with the selected collection items
    updateSideNavDefinition({ collections: getSelectedCollectionItems(navItems) });
  }, [navItems, updateSideNavDefinition]);

  useEffect(() => {
    return () => {
      updateSideNavDefinition({ collections: undefined });
    };
  }, [updateSideNavDefinition]);

  return (
    <EnterpriseSearchPageTemplateWrapper
      {...pageTemplateProps}
      solutionNav={{
        items: chromeStyle === 'classic' ? navItems : undefined,
        name: SEARCH_PRODUCT_NAME,
      }}
      setPageChrome={pageChrome && <SetAnalyticsChrome trail={pageChrome} />}
    >
      {pageViewTelemetry && (
        <SendEnterpriseSearchTelemetry action="viewed" metric={pageViewTelemetry} />
      )}
      {children}
    </EnterpriseSearchPageTemplateWrapper>
  );
};
