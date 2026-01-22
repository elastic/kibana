/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiFlexGroup, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const MitreAttackRuleCoveragePanel: React.FC = () => {
  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiText size="s">
          {i18n.translate(
            'xpack.securitySolution.siemReadiness.coverage.dataRuleCoverage.mitreAttack',
            {
              defaultMessage: 'Coming Soon',
            }
          )}
        </EuiText>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
