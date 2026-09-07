/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageTemplate, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SyncStatusBanner } from './sync_status_banner';

interface PlaceholderPageProps {
  readonly title: React.ReactNode;
  readonly description: React.ReactNode;
}

export const PlaceholderPage = ({ title, description }: PlaceholderPageProps) => (
  <>
    <EuiPageTemplate.Header pageTitle={title} bottomBorder />
    <EuiSpacer size="l" />
    <EuiPageTemplate.Section>
      <SyncStatusBanner />
      <EuiSpacer size="m" />
      <EuiText>{description}</EuiText>
      <EuiSpacer size="s" />
      <EuiText color="subdued">
        <FormattedMessage
          id="xpack.sdlcIntel.placeholder.comingSoon"
          defaultMessage="Dashboard widgets will be added in the next step."
        />
      </EuiText>
    </EuiPageTemplate.Section>
  </>
);
