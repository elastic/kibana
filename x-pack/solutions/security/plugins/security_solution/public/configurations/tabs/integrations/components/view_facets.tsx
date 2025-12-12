/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFacetGroup, EuiFacetButton } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

import { i18n } from '@kbn/i18n';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { IntegrationsFacets } from '../../../constants';
import { useNavigation } from '../../../../common/lib/kibana';

export interface Props {
  allCount: number;
  installedCount: number;
  selectedFacet: IntegrationsFacets;
}

export const ALL = i18n.translate('xpack.securitySolution.configurations.integrations.allFacet', {
  defaultMessage: 'All integrations',
});

export const INSTALLED = i18n.translate(
  'xpack.securitySolution.configurations.integrations.installedFacet',
  {
    defaultMessage: 'Installed integrations',
  }
);

export function IntegrationViewFacets({ allCount, installedCount, selectedFacet }: Props) {
  const { navigateTo } = useNavigation();

  return (
    <EuiFacetGroup>
      <EuiFacetButton
        css={css`
          padding-inline: 0px;
        `}
        id="integrationsAll"
        quantity={allCount}
        isSelected={selectedFacet === IntegrationsFacets.available}
        data-test-subj={'configurations.integrationsAll'}
        onClick={() =>
          navigateTo({
            deepLinkId: SecurityPageName.configurationsIntegrations,
            path: 'browse',
          })
        }
      >
        {ALL}
      </EuiFacetButton>
      <EuiFacetButton
        css={css`
          padding-inline: 0px;
        `}
        id="integrationsInstalled"
        quantity={installedCount}
        isSelected={selectedFacet === IntegrationsFacets.installed}
        data-test-subj={'configurations.integrationsInstalled'}
        onClick={() =>
          navigateTo({
            deepLinkId: SecurityPageName.configurationsIntegrations,
            path: 'installed',
          })
        }
      >
        {INSTALLED}
      </EuiFacetButton>
    </EuiFacetGroup>
  );
}
