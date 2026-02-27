/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';

export const SetupAISearchButton: React.FC = () => {
  const {
    services: { docLinks },
  } = useKibana();
  return (
    <EuiPanel hasBorder={false} hasShadow={false} color="transparent">
      <EuiFlexGroup gutterSize="s" direction="column" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiText>
            <h6>
              {i18n.translate('xpack.searchIndices.quickStats.setup_ai_search_description', {
                defaultMessage: 'Build AI-powered search experiences with Elastic',
              })}
            </h6>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            href={docLinks.links.enterpriseSearch.semanticSearch}
            target="_blank"
            data-test-subj="setupAISearchButton"
          >
            {i18n.translate('xpack.searchIndices.quickStats.setup_ai_search_button', {
              defaultMessage: 'Set up now',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
