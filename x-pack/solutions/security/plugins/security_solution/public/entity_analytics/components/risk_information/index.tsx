/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import styled from '@emotion/styled';
import {
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import * as i18n from './translations';
import { useOnOpenCloseHandler } from '../../../helper_hooks';
import { RiskScoreLevel } from '../severity/common';
import type { EntityType } from '../../../../common/entity_analytics/types';
import { RiskSeverity } from '../../../../common/search_strategy';
import {
  CriticalityLevels,
  CriticalityModifiers,
} from '../../../../common/entity_analytics/asset_criticality';
import { AssetCriticalityBadge } from '../asset_criticality';
import { EntityAnalyticsLearnMoreLink } from '../entity_analytics_learn_more_link';

const SpacedOrderedList = styled.ol`
  li {
    margin-bottom: ${({ theme: { euiTheme } }) => euiTheme.size.m};
  }
`;

interface RiskLevelTableItem {
  range?: string;
  level: RiskSeverity;
}

const getRiskLevelTableColumns = (): Array<EuiBasicTableColumn<RiskLevelTableItem>> => [
  {
    field: 'level',
    name: i18n.INFORMATION_LEVEL_HEADER,
    render: (riskScore?: RiskSeverity) => {
      if (riskScore != null) {
        return <RiskScoreLevel severity={riskScore} hideBackgroundColor />;
      }
    },
  },
  {
    field: 'range',
    name: i18n.INFORMATION_RISK_HEADER,
  },
];

const riskLevelTableItems: RiskLevelTableItem[] = [
  { level: RiskSeverity.Critical, range: i18n.CRITICAL_RISK_DESCRIPTION },
  { level: RiskSeverity.High, range: '70 - 90 ' },
  { level: RiskSeverity.Moderate, range: '40 - 70' },
  { level: RiskSeverity.Low, range: '20 - 40' },
  { level: RiskSeverity.Unknown, range: i18n.UNKNOWN_RISK_DESCRIPTION },
];

interface CriticalityLevelTableItem {
  level: CriticalityLevels;
  weight: number;
}

const criticalityLevelTableItems: CriticalityLevelTableItem[] = [
  CriticalityLevels.EXTREME_IMPACT,
  CriticalityLevels.HIGH_IMPACT,
  CriticalityLevels.MEDIUM_IMPACT,
  CriticalityLevels.LOW_IMPACT,
].map((level) => ({ level, weight: CriticalityModifiers[level] }));

const getCriticalityLevelTableColumns = (): Array<
  EuiBasicTableColumn<CriticalityLevelTableItem>
> => [
  {
    field: 'level',
    name: i18n.INFORMATION_TIER_HEADER,
    render: (level: CriticalityLevels) => <AssetCriticalityBadge criticalityLevel={level} />,
  },
  {
    field: 'weight',
    name: i18n.INFORMATION_WEIGHT_HEADER,
  },
];

export const HOST_RISK_INFO_BUTTON_CLASS = 'HostRiskInformation__button';
export const USER_RISK_INFO_BUTTON_CLASS = 'UserRiskInformation__button';

export const RiskInformationButtonEmpty = ({ riskEntity }: { riskEntity: EntityType }) => {
  const [isFlyoutVisible, handleOnOpen, handleOnClose] = useOnOpenCloseHandler();

  return (
    <>
      <EuiButtonEmpty onClick={handleOnOpen} data-test-subj="open-risk-information-flyout-trigger">
        {i18n.INFO_BUTTON_TEXT}
      </EuiButtonEmpty>
      {isFlyoutVisible && <RiskInformationFlyout handleOnClose={handleOnClose} />}
    </>
  );
};

export const RiskInformationFlyout = ({ handleOnClose }: { handleOnClose: () => void }) => {
  const simpleFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'RiskInformation',
  });

  return (
    <EuiFlyout
      ownFocus
      onClose={handleOnClose}
      aria-labelledby={simpleFlyoutTitleId}
      size={450}
      data-test-subj="open-risk-information-flyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2 id={simpleFlyoutTitleId}>{i18n.TITLE}</h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.securitySolution.riskInformation.introText"
              defaultMessage="Entity Risk Analytics surfaces risky hosts and users from within your environment."
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.securitySolution.riskInformation.riskScoreFieldText"
              defaultMessage="The {riskScoreField} field represents the normalized risk of the Entity as a single numeric value. You can use this value as a relative indicator of risk in triaging and response playbooks."
              values={{
                riskScoreField: (
                  <b>
                    <FormattedMessage
                      id="xpack.securitySolution.riskInformation.riskScoreFieldLabel"
                      defaultMessage="Entity risk score"
                    />
                  </b>
                ),
              }}
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.securitySolution.riskInformation.riskScoreLevelText"
              defaultMessage="The {riskLevelField} field represents the risk level of
              the Entity based on set of predefined risk metrics."
              values={{
                riskLevelField: (
                  <b>
                    <FormattedMessage
                      id="xpack.securitySolution.riskInformation.riskScoreLevelLabel"
                      defaultMessage="Entity risk level"
                    />
                  </b>
                ),
              }}
            />
          </p>
          <EuiTitle size="xxs">
            <h3>
              <FormattedMessage
                id="xpack.securitySolution.riskInformation.howOftenTitle"
                defaultMessage="How often is risk calculated?"
              />
            </h3>
          </EuiTitle>
          <p>
            <FormattedMessage
              id="xpack.securitySolution.riskInformation.howOftenText"
              defaultMessage="Once enabled, entity risk scoring runs hourly."
            />
          </p>
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.securitySolution.riskInformation.howCalculatedTitle"
                defaultMessage="How is risk calculated?"
              />
            </h3>
          </EuiTitle>
          <SpacedOrderedList>
            <li>
              <FormattedMessage
                id="xpack.securitySolution.riskInformation.riskCalculationStep1"
                defaultMessage="Only scores users and hosts (entities) associated with detection alerts that have not been closed."
              />
            </li>
            <li>
              <FormattedMessage
                id="xpack.securitySolution.riskInformation.riskCalculationStep2"
                defaultMessage="Generates an 'Alert' category score by aggregating alerts by entity idenfifier such that alerts with higher risk scores contribute more than alerts with lower risk scores."
              />
            </li>
            <li>
              <FormattedMessage
                id="xpack.securitySolution.riskInformation.riskCalculationStep3"
                defaultMessage="If the 'Asset Criticality' feature is enabled in your space, entity risk scoring verifies the asset criticality classification tier of the entity and generates a score modifier under the 'Asset Criticality' category."
              />
              <EuiSpacer size="s" />
              <EuiBasicTable
                columns={getCriticalityLevelTableColumns()}
                items={criticalityLevelTableItems}
                data-test-subj="criticality-level-information-table"
              />
              <EuiSpacer size="s" />
            </li>
            <li>
              <FormattedMessage
                id="xpack.securitySolution.riskInformation.riskCalculationStep4"
                defaultMessage="Produces entity risk as a normalized numeric score."
              />
            </li>
            <li>
              <FormattedMessage
                id="xpack.securitySolution.riskInformation.riskCalculationStep5"
                defaultMessage="Maps the entity risk label based on the normalized risk score."
              />
              <EuiSpacer size="s" />
              <EuiBasicTable
                columns={getRiskLevelTableColumns()}
                items={riskLevelTableItems}
                data-test-subj="risk-level-information-table"
              />
              <EuiSpacer size="s" />
            </li>
          </SpacedOrderedList>
        </EuiText>
        <EuiSpacer size="m" />
        <EntityAnalyticsLearnMoreLink />
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton onClick={handleOnClose}>{i18n.CLOSE_BUTTON_TEXT}</EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
