/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiIcon } from '@elastic/eui';
import { usePluginContext } from '../../../hooks/use_plugin_context';

export const ClusterListingPage: React.FC = () => {
  const { ObservabilityPageTemplate } = usePluginContext();

  return (
    <ObservabilityPageTemplate
      data-test-subj="kubernetesClustersPage"
      pageHeader={{
        pageTitle: (
          <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <EuiIcon type="logoKubernetes" size="xl" />
            {i18n.translate('xpack.kubernetesPoc.clusterListing.pageTitle', {
              defaultMessage: 'Kubernetes Clusters',
            })}
          </span>
        ),
      }}
    >
      {/* Cluster listing content will go here */}
    </ObservabilityPageTemplate>
  );
};
