/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiImage, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import illustration from '../../../common/images/illustration_product_no_results_magnifying_glass.svg';

export const RecentAnomaliesHeatmapNoResults: React.FC = () => {
  return (
    <EuiFlexGroup css={{ maxWidth: '600px' }}>
      <EuiFlexItem>
        <EuiText size="s">
          <EuiTitle>
            <h3>
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.recentAnomalies.noResultsTitle"
                defaultMessage="No anomaly results match your search criteria"
              />
            </h3>
          </EuiTitle>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiImage
          size="200px"
          alt={i18n.translate(
            'xpack.securitySolution.entityAnalytics.recentAnomalies.emptyState.illustrationAlt',
            {
              defaultMessage: 'No results',
            }
          )}
          url={illustration}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
