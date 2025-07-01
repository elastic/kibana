/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiLoadingLogo } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const LOADING_TITLE = (pageName: string) =>
  i18n.translate('xpack.securitySolution.page.loader', {
    defaultMessage: 'Loading {pageName}',
    values: { pageName },
  });

export const DataViewLoading = ({ pageName }: { pageName: string }) => (
  <EuiEmptyPrompt
    icon={<EuiLoadingLogo logo="logoSecurity" size="xl" />}
    title={<h2>{LOADING_TITLE(pageName)}</h2>}
  />
);
