/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KibanaVersionBadge, TrialUsageBadge } from '@kbn/search-shared-ui';

import { docLinks } from '../../common/doc_links';
import { useKibana } from '../../hooks/use_kibana';

export const DeploymentStatusBadges: React.FC = () => {
  const {
    services: { cloud, kibanaVersion },
  } = useKibana();
  const isTrial = cloud?.isInTrial() ?? false;

  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent={isTrial ? 'spaceBetween' : 'flexEnd'}
      responsive={false}
    >
      {isTrial && cloud && (
        <EuiFlexItem grow={false}>
          <TrialUsageBadge cloud={cloud} />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <KibanaVersionBadge
          docLink={
            cloud?.isServerlessEnabled
              ? docLinks.serverlessReleaseNotes
              : cloud?.isCloudEnabled
              ? docLinks.hostedCloudReleaseNotes
              : docLinks.releaseNotes
          }
          kibanaVersion={
            !cloud?.isServerlessEnabled
              ? `v${kibanaVersion}`
              : i18n.translate('xpack.searchGettingStarted.changelog', {
                  defaultMessage: 'Changelog',
                })
          }
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
