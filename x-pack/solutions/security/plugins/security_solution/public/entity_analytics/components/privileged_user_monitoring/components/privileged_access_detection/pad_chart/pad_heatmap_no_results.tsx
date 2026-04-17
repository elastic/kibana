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
import illustration from '../../../../../../common/images/illustration_product_no_results_magnifying_glass.svg';

export const PrivilegedAccessDetectionHeatmapNoResults: React.FC = () => {
  return (
    <EuiFlexGroup css={{ maxWidth: '600px' }}>
      <EuiFlexItem>
        <EuiText size="s">
          <EuiTitle>
            <h3>
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedAccessDetection.noResultsTitle"
                defaultMessage="No privileged access detection results match your search criteria"
              />
            </h3>
          </EuiTitle>
          <p>
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedAccessDetection.noResultsDescription"
              defaultMessage={`Now that you've got the privileged access detection anomaly jobs installed, you can click "ML job settings" above to configure and run them within your environment.`}
            />
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiImage
          size="200px"
          alt={i18n.translate(
            'xpack.securitySolution.privilegedUserMonitoring.privilegedAccessDetection.emptyState.illustrationAlt',
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
