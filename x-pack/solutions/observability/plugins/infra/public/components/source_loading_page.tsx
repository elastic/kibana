/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

import { LoadingPage } from './loading_page';

export const SourceLoadingPage: React.FunctionComponent = () => (
  <LoadingPage
    data-test-subj="sourceLoadingPage"
    message={
      <FormattedMessage
        id="xpack.infra.sourceLoadingPage.loadingDataSourcesMessage"
        defaultMessage="Loading data sources"
      />
    }
  />
);
