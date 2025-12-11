/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiIcon, EuiLink } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { usePluginContext } from '../../../hooks/use_plugin_context';

export const OverviewPage: React.FC = () => {
  const { ObservabilityPageTemplate } = usePluginContext();
  const history = useHistory();

  return (
    <ObservabilityPageTemplate
      data-test-subj="kubernetesOverviewPage"
      pageHeader={{
        pageTitle: (
          <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <EuiIcon type="logoKubernetes" size="xl" />
            {i18n.translate('xpack.kubernetesPoc.overview.pageTitle', {
              defaultMessage: 'Kubernetes Overview',
            })}
          </span>
        ),
      }}
    >
      {/* Temporary link to cluster listing page */}
      <EuiLink
        data-test-subj="kubernetesPocOverviewPageGoToClusterListing→Link"
        onClick={() => history.push('/clusters')}
      >
        {i18n.translate('xpack.kubernetesPoc.overview.goToClustersLink', {
          defaultMessage: 'Go to Cluster Listing →',
        })}
      </EuiLink>
    </ObservabilityPageTemplate>
  );
};
