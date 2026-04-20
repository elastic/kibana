/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { usePluginContext } from '../../hooks/use_plugin_context';

export function SigeventsOverviewPage() {
  const { ObservabilityPageTemplate } = usePluginContext();

  return (
    <ObservabilityPageTemplate
      isPageDataLoaded={true}
      data-test-subj="obltSigeventsOverviewPageHeader"
      pageSectionProps={{
        contentProps: {
          style: {
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
          },
        },
      }}
    >
      <EuiEmptyPrompt
        iconType="logoObservability"
        data-test-subj="obltSigeventsOverviewPlaceholder"
        css={{
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
        }}
        title={
          <h2>
            {i18n.translate('xpack.observability.sigeventsOverview.emptyState.title', {
              defaultMessage: 'Significant events overview',
            })}
          </h2>
        }
        body={
          <p>
            {i18n.translate('xpack.observability.sigeventsOverview.emptyState.body', {
              defaultMessage:
                'This area will become a full chat experience for exploring significant events.',
            })}
          </p>
        }
      />
    </ObservabilityPageTemplate>
  );
}
