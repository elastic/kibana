/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ProfilingAppPageTemplate } from '../../components/profiling_app_page_template';

export function ProfilingNotEnabledView() {
  return (
    <ProfilingAppPageTemplate hideSearchBar tabs={[]}>
      <EuiEmptyPrompt
        iconType="warning"
        iconColor="warning"
        title={
          <h2>
            {i18n.translate('xpack.profiling.profilingNotEnabled.title', {
              defaultMessage: 'Universal Profiling is not enabled in Elasticsearch',
            })}
          </h2>
        }
        body={
          <p>
            {i18n.translate('xpack.profiling.profilingNotEnabled.description', {
              defaultMessage:
                'The current Elasticsearch cluster has Universal Profiling disabled. Contact your administrator to enable profiling resources and try again.',
            })}
          </p>
        }
      />
    </ProfilingAppPageTemplate>
  );
}
