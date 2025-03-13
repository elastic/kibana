/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { useAddIntegrationsUrl } from '../../../../common/hooks/use_add_integrations_url';
import { IntegrationBadge } from './integration_badge';
import { MORE_INTEGRATIONS, SUB_TITLE, TITLE } from './translations';

const PRIMARY_INTEGRATIONS = [
  'splunk', // doesnt yet exist
  'sentinel_one',
  'google_secops',
];

export interface LandingPageProps {
  /**
   *
   */
  packages: PackageListItem[];
}

/**
 *
 */
export const LandingPage = ({ packages }: LandingPageProps) => {
  const { onClick: addIntegration } = useAddIntegrationsUrl();

  const primaryPackages = useMemo(
    () =>
      packages
        .filter((pkg) => PRIMARY_INTEGRATIONS.includes(pkg.name))
        .sort(
          (a, b) => PRIMARY_INTEGRATIONS.indexOf(a.name) - PRIMARY_INTEGRATIONS.indexOf(b.name)
        ),
    [packages]
  );
  console.log('primaryPackages', primaryPackages);

  return (
    <EuiFlexGroup direction="column" alignItems="center">
      <EuiFlexItem>
        <div
          css={css`
            height: 400px;
            width: 700px;
            background-color: gray;
          `}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiEmptyPrompt
          actions={
            <EuiFlexGroup gutterSize="m" alignItems="center">
              {primaryPackages.map((pkg) => (
                <EuiFlexItem grow={false}>
                  <IntegrationBadge integration={pkg} />
                </EuiFlexItem>
              ))}
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={addIntegration} iconType="plusInCircle">
                  {MORE_INTEGRATIONS}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          body={<p>{SUB_TITLE}</p>}
          title={<h2>{TITLE}</h2>}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

LandingPage.displayName = 'LandingPage';
