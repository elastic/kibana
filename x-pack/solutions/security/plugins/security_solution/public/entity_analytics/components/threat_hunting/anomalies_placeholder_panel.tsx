/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiText, EuiImage } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import placeholderImage from '../../../common/images/placeholder.png';

export const AnomaliesPlaceholderPanel = () => {
  return (
    <EuiPanel data-test-subj="anomalies-placeholder-panel">
      <EuiText color="subdued" textAlign="center">
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.threatHunting.anomaliesPlaceholder"
          defaultMessage="Anomaly explorer"
        />
      </EuiText>
      <EuiImage
        data-test-subj="anomalies-placeholder-image"
        hasShadow
        size="fullWidth"
        src={placeholderImage}
        alt="Anomaly explorer placeholder"
      />
    </EuiPanel>
  );
};
