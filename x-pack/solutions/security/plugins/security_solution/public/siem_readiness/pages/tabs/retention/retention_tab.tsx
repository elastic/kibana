/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const RetentionTab: React.FC = () => {
  return (
    <>
      <EuiSpacer size="m" />
      <EuiText>
        <p>
          {i18n.translate(
            'xpack.securitySolution.siemReadiness.visibility.retention.tab.placeholder',
            {
              defaultMessage: 'Retention tab content will be implemented here.',
            }
          )}
        </p>
      </EuiText>
    </>
  );
};
