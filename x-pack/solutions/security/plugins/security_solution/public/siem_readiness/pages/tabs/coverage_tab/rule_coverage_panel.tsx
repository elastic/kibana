/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const RuleCoveragePanel: React.FC = () => {
  return (
    <EuiPanel hasBorder>
      <EuiEmptyPrompt
        iconType="editorStrike"
        title={
          <h2>
            {i18n.translate(
              'xpack.securitySolution.siemReadiness.coverage.ruleCoverage.emptyTitle',
              {
                defaultMessage: 'Rule coverage coming soon',
              }
            )}
          </h2>
        }
        body={
          <p>
            {i18n.translate(
              'xpack.securitySolution.siemReadiness.coverage.ruleCoverage.emptyDescription',
              {
                defaultMessage: 'This panel will show rule coverage information.',
              }
            )}
          </p>
        }
      />
    </EuiPanel>
  );
};
