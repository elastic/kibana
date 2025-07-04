/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiPanel } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EntityType } from '../../../common/search_strategy';
import { RiskScoreHeaderTitle } from './risk_score_header_title';
import { HeaderSection } from '../../common/components/header_section';

const RiskScoresNoDataDetectedComponent = ({ entityType }: { entityType: EntityType }) => {
  return (
    <EuiPanel data-test-subj={`${entityType}-risk-score-no-data-detected`} hasBorder>
      <HeaderSection title={<RiskScoreHeaderTitle riskScoreEntity={entityType} />} titleSize="s" />
      <EuiEmptyPrompt
        title={
          <h2>
            <FormattedMessage
              id="xpack.securitySolution.riskScore.entityDashboardWarningPanelTitle"
              defaultMessage="No {entityType} risk score data available to display"
              values={{
                entityType,
              }}
            />
          </h2>
        }
        body={
          <FormattedMessage
            id="xpack.securitySolution.riskScore.entityDashboardWarningPanelBody"
            defaultMessage={`We haven’t found any {entityType} risk score data. Check if you have any global filters in the global KQL search bar. If you have just enabled the {entityType} risk module, the risk engine might need an hour to generate {entityType} risk score data and display in this panel.`}
            values={{ entityType }}
          />
        }
      />
    </EuiPanel>
  );
};

export const RiskScoresNoDataDetected = React.memo(RiskScoresNoDataDetectedComponent);
RiskScoresNoDataDetected.displayName = 'RiskScoresNoDataDetected';
