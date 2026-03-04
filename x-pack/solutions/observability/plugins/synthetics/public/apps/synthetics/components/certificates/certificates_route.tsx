/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SyntheticsPageTemplateComponent } from '../common/page_template/synthetics_page_template';
import { CertificatesPage } from './certificates';
import { useCertSearch } from './use_cert_search';
import { useCertificatesNoDataConfig } from './use_certificates_no_data_config';

/**
 * Route wrapper for the Certificates page that shows the shared no-data state
 * when there are no certificates, instead of an empty table.
 */
export const CertificatesRoute: React.FC = () => {
  const certificates = useCertSearch({
    pageIndex: 0,
    size: 1,
    search: '',
  });
  const noDataConfig = useCertificatesNoDataConfig();

  const showNoData =
    !certificates.isLoading && (certificates.total ?? 0) === 0;

  return (
    <SyntheticsPageTemplateComponent
      data-test-subj="synthetics-page-template"
      isPageDataLoaded={!certificates.isLoading}
      noDataConfig={showNoData ? noDataConfig : undefined}
    >
      <CertificatesPage />
    </SyntheticsPageTemplateComponent>
  );
};
