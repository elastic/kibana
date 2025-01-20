/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';

import { useValues } from 'kea';

import { i18n } from '@kbn/i18n';

import { generateEncodedPath } from '../../../../shared/encode_path_params';
import { KibanaLogic } from '../../../../shared/kibana';
import {
  SearchApplicationViewTabs,
  SearchApplicationConnectTabs,
  SEARCH_APPLICATION_CONNECT_PATH,
} from '../../../routes';
import { EnterpriseSearchApplicationsPageTemplate } from '../../layout/page_template';

import { SearchApplicationViewLogic } from '../search_application_view_logic';

import { SearchApplicationAPI } from './search_application_api';

import '../search_application_layout.scss';
import { SearchApplicationDocumentation } from './search_application_documentation';

const pageTitle = i18n.translate(
  'xpack.enterpriseSearch.searchApplications.searchApplication.connect.pageTitle',
  {
    defaultMessage: 'Connect',
  }
);
const SAFE_SEARCH_API_TAB_TITLE = i18n.translate(
  'xpack.enterpriseSearch.searchApplications.searchApplication.connect.searchAPITabTitle',
  {
    defaultMessage: 'Search API',
  }
);
const DOCUMENTATION_TAB_TITLE = i18n.translate(
  'xpack.enterpriseSearch.searchApplications.searchApplication.connect.documentationTabTitle',
  {
    defaultMessage: 'Documentation',
  }
);
const getTabBreadCrumb = (tabId: string) => {
  switch (tabId) {
    case SearchApplicationConnectTabs.SEARCHAPI:
      return SAFE_SEARCH_API_TAB_TITLE;
    case SearchApplicationConnectTabs.DOCUMENTATION:
      return DOCUMENTATION_TAB_TITLE;
    default:
      return tabId;
  }
};

export const SearchApplicationConnect: React.FC = () => {
  const { searchApplicationName, isLoadingSearchApplication, hasSchemaConflicts } = useValues(
    SearchApplicationViewLogic
  );
  const { connectTabId = SearchApplicationConnectTabs.SEARCHAPI } = useParams<{
    connectTabId?: string;
  }>();

  const onTabClick = (tab: SearchApplicationConnectTabs) => () => {
    KibanaLogic.values.navigateToUrl(
      generateEncodedPath(SEARCH_APPLICATION_CONNECT_PATH, {
        connectTabId: tab,
        searchApplicationName,
      })
    );
  };

  return (
    <EnterpriseSearchApplicationsPageTemplate
      pageChrome={[searchApplicationName, pageTitle, getTabBreadCrumb(connectTabId)]}
      pageViewTelemetry={SearchApplicationViewTabs.CONNECT}
      isLoading={isLoadingSearchApplication}
      pageHeader={{
        bottomBorder: false,
        className: 'searchApplicationHeaderBackgroundColor',
        pageTitle,
        rightSideItems: [],
        tabs: [
          {
            isSelected: connectTabId === SearchApplicationConnectTabs.SEARCHAPI,
            label: SAFE_SEARCH_API_TAB_TITLE,
            onClick: onTabClick(SearchApplicationConnectTabs.SEARCHAPI),
          },
          {
            isSelected: connectTabId === SearchApplicationConnectTabs.DOCUMENTATION,
            label: DOCUMENTATION_TAB_TITLE,
            onClick: onTabClick(SearchApplicationConnectTabs.DOCUMENTATION),
          },
        ],
      }}
      searchApplicationName={searchApplicationName}
      hasSchemaConflicts={hasSchemaConflicts}
    >
      {connectTabId === SearchApplicationConnectTabs.SEARCHAPI && <SearchApplicationAPI />}
      {connectTabId === SearchApplicationConnectTabs.DOCUMENTATION && (
        <SearchApplicationDocumentation />
      )}
    </EnterpriseSearchApplicationsPageTemplate>
  );
};
