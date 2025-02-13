/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { SEARCH_PRODUCT_NAME } from '../../../../../common/constants';
import { SetVectorSearchChrome } from '../../../shared/kibana_chrome';
import {
  EnterpriseSearchPageTemplateWrapper,
  PageTemplateProps,
  useEnterpriseSearchNav,
} from '../../../shared/layout';
import { SendEnterpriseSearchTelemetry } from '../../../shared/telemetry';

export const EnterpriseSearchVectorSearchPageTemplate: React.FC<PageTemplateProps> = ({
  children,
  pageChrome,
  pageViewTelemetry,
  ...pageTemplateProps
}) => (
  <EnterpriseSearchPageTemplateWrapper
    {...pageTemplateProps}
    solutionNav={{
      items: useEnterpriseSearchNav(),
      name: SEARCH_PRODUCT_NAME,
    }}
    setPageChrome={pageChrome && <SetVectorSearchChrome trail={pageChrome} />}
  >
    {pageViewTelemetry && (
      <SendEnterpriseSearchTelemetry action="viewed" metric={pageViewTelemetry} />
    )}
    {children}
  </EnterpriseSearchPageTemplateWrapper>
);
