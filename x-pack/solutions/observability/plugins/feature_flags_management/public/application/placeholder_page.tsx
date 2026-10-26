/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiEmptyPrompt, EuiPageTemplate } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { API_BASE_PATH } from '../../common/constants';

export const PlaceholderPage = () => (
  <EuiPageTemplate data-test-subj="featureFlagsManagementApp">
    <EuiPageTemplate.Header
      pageTitle={
        <FormattedMessage
          id="xpack.featureFlagsManagement.placeholderPage.title"
          defaultMessage="Feature flags"
        />
      }
    />
    <EuiPageTemplate.Section>
      <EuiEmptyPrompt
        iconType="flag"
        title={
          <h2>
            <FormattedMessage
              id="xpack.featureFlagsManagement.placeholderPage.promptTitle"
              defaultMessage="Coming soon"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.featureFlagsManagement.placeholderPage.promptBody"
              defaultMessage="Manage feature flags, apps, environments and credentials here. Until then, use the {apiPath} API."
              values={{ apiPath: <EuiCode>{API_BASE_PATH}</EuiCode> }}
            />
          </p>
        }
      />
    </EuiPageTemplate.Section>
  </EuiPageTemplate>
);
