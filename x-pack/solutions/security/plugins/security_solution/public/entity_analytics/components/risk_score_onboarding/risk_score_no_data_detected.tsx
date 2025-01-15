/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiPanel, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { HeaderSection } from '../../../common/components/header_section';
import { RiskScoreHeaderTitle } from './risk_score_header_title';
import { RiskScoreRestartButton } from './risk_score_restart_button';
import type { inputsModel } from '../../../common/store';
import { useIsNewRiskScoreModuleInstalled } from '../../api/hooks/use_risk_engine_status';
import type { EntityType } from '../../../../common/search_strategy';

export const RESTART_TOOLTIP = i18n.translate(
  'xpack.securitySolution.riskScore.usersDashboardRestartTooltip',
  {
    defaultMessage:
      'The risk score calculation might take a while to run. However, by pressing restart, you can force it to run immediately.',
  }
);

const RiskScoresNoDataDetectedComponent = ({
  entityType,
  refetch,
}: {
  entityType: EntityType;
  refetch: inputsModel.Refetch;
}) => {
  const isNewRiskScoreModuleInstalled = useIsNewRiskScoreModuleInstalled();

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
        actions={
          <>
            {!isNewRiskScoreModuleInstalled && (
              <EuiToolTip content={RESTART_TOOLTIP}>
                <RiskScoreRestartButton refetch={refetch} riskScoreEntity={entityType} />
              </EuiToolTip>
            )}
          </>
        }
      />
    </EuiPanel>
  );
};

export const RiskScoresNoDataDetected = React.memo(RiskScoresNoDataDetectedComponent);
RiskScoresNoDataDetected.displayName = 'RiskScoresNoDataDetected';
