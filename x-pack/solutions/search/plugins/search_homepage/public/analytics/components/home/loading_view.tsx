/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSkeletonRectangle, EuiSkeletonText, EuiSkeletonTitle, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { readableLine } from '../shared/shared_styles';

/** Placeholder with the proportions of a stage view: a header block above one panel. */
export const LoadingView = (): React.JSX.Element => {
  const loadingLabel = i18n.translate('xpack.searchHomepage.analytics.home.loadingLabel', {
    defaultMessage: 'Checking your deployment for data',
  });

  return (
    <KibanaPageTemplate.Section paddingSize="xl" grow={false} data-test-subj="analyticsHomeLoading">
      <div css={readableLine}>
        <EuiSkeletonTitle size="l" isLoading contentAriaLabel={loadingLabel} />
        <EuiSpacer size="m" />
        <EuiSkeletonText lines={2} size="m" isLoading />
      </div>
      <EuiSpacer size="l" />
      <EuiSkeletonRectangle width="100%" height={320} borderRadius="m" isLoading />
    </KibanaPageTemplate.Section>
  );
};
