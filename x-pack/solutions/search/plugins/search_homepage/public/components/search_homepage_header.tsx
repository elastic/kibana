/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiPageTemplate, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { EndpointsHeaderAction } from './endpoints_header_action';

export interface SearchHomepageHeaderProps {
  showEndpointsAPIKeys: boolean;
}

export const SearchHomepageHeader = ({ showEndpointsAPIKeys }: SearchHomepageHeaderProps) => (
  <EuiPageTemplate.Header
    pageTitle={
      <EuiTitle data-test-subj="search-homepage-header-title" size="l">
        <FormattedMessage id="xpack.searchHomepage.pageTitle" defaultMessage="Welcome to Search" />
      </EuiTitle>
    }
    data-test-subj="search-homepage-header"
    rightSideItems={[...(showEndpointsAPIKeys ? [<EndpointsHeaderAction />] : [])]}
  />
);
