/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn, EuiRangeProps, EuiSelectableOption } from '@elastic/eui';
import {
  EuiSpacer,
  EuiInMemoryTable,
  EuiTitle,
  EuiCallOut,
  EuiBadge,
  EuiCard,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiModalHeader,
  EuiModal,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiSelectable,
  EuiCheckableCard,
  EuiText,
  EuiRange,
  EuiFieldNumber,
} from '@elastic/eui';
import type { ReactNode } from 'react';
import React, { useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';

import { get } from 'lodash/fp';
import { AlertPreviewButton } from '../../../../../flyout/shared/components/alert_preview_button';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
import { useQueryInspector } from '../../../../../common/components/page/manage_query';
import { formatRiskScore } from '../../../../common';
import type {
  InputAlert,
  UseRiskContributingAlertsResult,
} from '../../../../hooks/use_risk_contributing_alerts';
import { useRiskContributingAlerts } from '../../../../hooks/use_risk_contributing_alerts';
import { PreferenceFormattedDate } from '../../../../../common/components/formatted_date';

import { useRiskScore } from '../../../../api/hooks/use_risk_score';
import type { EntityRiskScore, EntityType } from '../../../../../../common/search_strategy';
import { buildEntityNameFilter } from '../../../../../../common/search_strategy';
import { AssetCriticalityBadge } from '../../../asset_criticality';
import { RiskInputsUtilityBar } from '../../components/utility_bar';
import { ActionColumn } from '../../components/action_column';

export interface RiskInputsTabProps<T extends EntityType> {
  entityType: T;
  entityName: string;
  scopeId: string;
}

const FIRST_RECORD_PAGINATION = {
  cursorStart: 0,
  querySize: 1,
};

export const EXPAND_ALERT_TEST_ID = 'risk-input-alert-preview-button';
export const RISK_INPUTS_TAB_QUERY_ID = 'RiskInputsTabQuery';

export const RiskInputsTab = <T extends EntityType>({
  entityType,
  entityName,
  scopeId,
}: RiskInputsTabProps<T>) => {
  const { setQuery, deleteQuery } = useGlobalTime();
  const [selectedItems, setSelectedItems] = useState<InputAlert[]>([]);

  const nameFilterQuery = useMemo(() => {
    return buildEntityNameFilter(entityType, [entityName]);
  }, [entityName, entityType]);

  const {
    data: riskScoreData,
    error: riskScoreError,
    loading: loadingRiskScore,
    inspect: inspectRiskScore,
    refetch,
  } = useRiskScore<T>({
    riskEntity: entityType,
    filterQuery: nameFilterQuery,
    onlyLatest: false,
    pagination: FIRST_RECORD_PAGINATION,
    skip: nameFilterQuery === undefined,
  });

  useQueryInspector({
    deleteQuery,
    inspect: inspectRiskScore,
    loading: loadingRiskScore,
    queryId: RISK_INPUTS_TAB_QUERY_ID,
    refetch,
    setQuery,
  });

  const [isAdjustRiskScoreModalVisible, setIsAdjustRiskScoreModalVisible] = useState(false);

  const closeAdjustRiskScoreModal = () => setIsAdjustRiskScoreModalVisible(false);
  const showAdjustRiskScoreModal = () => setIsAdjustRiskScoreModalVisible(true);

  const [isAddToWatchlistModalVisible, setIsAddToWatchlistModalVisible] = useState(false);

  const closeAddToWatchlistModal = () => setIsAddToWatchlistModalVisible(false);
  const showAddToWatchlistModal = () => setIsAddToWatchlistModalVisible(true);

  const [scaleValue, setScaleValue] = useState('1');

  const onChangeScaleValue: EuiRangeProps['onChange'] = (e) => {
    setScaleValue(e.currentTarget.value);
  };

  const [overrideValue, setOverrideValue] = useState('');

  const onChangeOverrideValue = (e) => {
    setOverrideValue(e.target.value);
  };

  const [radio, setRadio] = useState('radio1');

  const [watchlistOptions, setWatchlistOptions] = useState<EuiSelectableOption[]>([
    {
      label: 'Privileged Users',
      checked: 'on',
    },
    {
      label: 'Notice given',
    },
  ]);

  const riskScore = riskScoreData && riskScoreData.length > 0 ? riskScoreData[0] : undefined;

  const alerts = useRiskContributingAlerts<T>({ riskScore, entityType });

  const euiTableSelectionProps = useMemo(
    () => ({
      initialSelected: [],
      selectable: () => true,
      onSelectionChange: setSelectedItems,
    }),
    []
  );

  const inputColumns: Array<EuiBasicTableColumn<InputAlert>> = useMemo(
    () => [
      {
        render: (data: InputAlert) => (
          <AlertPreviewButton
            id={data._id}
            indexName={data.input.index}
            scopeId={scopeId}
            data-test-subj={EXPAND_ALERT_TEST_ID}
          />
        ),
        width: '5%',
      },
      {
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.riskInputs.actionsColumn"
            defaultMessage="Actions"
          />
        ),
        width: '80px',
        render: (data: InputAlert) => <ActionColumn input={data} />,
      },
      {
        field: 'input.timestamp',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.riskInputs.dateColumn"
            defaultMessage="Date"
          />
        ),
        truncateText: false,
        mobileOptions: { show: true },
        sortable: true,
        width: '30%',
        render: (timestamp: string) => <PreferenceFormattedDate value={new Date(timestamp)} />,
      },
      {
        field: 'alert',
        'data-test-subj': 'risk-input-table-description-cell',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.riskInputs.riskInputColumn"
            defaultMessage="Rule name"
          />
        ),
        truncateText: true,
        mobileOptions: { show: true },
        sortable: true,
        render: (alert: InputAlert['alert']) => get(ALERT_RULE_NAME, alert),
      },
      {
        field: 'input.contribution_score',
        'data-test-subj': 'risk-input-table-contribution-cell',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.riskInputs.contributionColumn"
            defaultMessage="Contribution"
          />
        ),
        truncateText: false,
        mobileOptions: { show: true },
        sortable: true,
        align: 'right',
        render: (value: number) => {
          return <EuiBadge color={'default'}>{formatContribution(value)}</EuiBadge>;
        },
      },
    ],
    [scopeId]
  );

  if (riskScoreError) {
    return (
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.riskInputs.errorTitle"
            defaultMessage="Something went wrong"
          />
        }
        color="danger"
        iconType="error"
      >
        <p>
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.riskInputs.errorBody"
            defaultMessage="Error while fetching risk inputs. Please try again later."
          />
        </p>
      </EuiCallOut>
    );
  }

  const riskInputsAlertSection = (title: string) => (
    <>
      <EuiTitle size="xs" data-test-subj="risk-input-alert-title">
        <h3>
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.riskInputs.alertsTitle"
            defaultMessage={title}
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <RiskInputsUtilityBar riskInputs={selectedItems} />
      <EuiInMemoryTable
        compressed={false}
        loading={loadingRiskScore || alerts.loading}
        items={alerts.data || []}
        columns={inputColumns}
        sorting
        selection={euiTableSelectionProps}
        itemId="_id"
      />
      <EuiSpacer size="s" />
      <ExtraAlertsMessage<T> riskScore={riskScore} alerts={alerts} entityType={entityType} />
    </>
  );

  return (
    <>
      <EuiCard
        textAlign="left"
        title={
          <p>
            <EuiIcon type="logoSecurity" size="xl" css={{ marginRight: '16px' }} />
            Risk summary
          </p>
        }
        description={
          <p>
            The combination of <b>numerous malware detection alerts</b>, a{' '}
            <b>very high-risk score</b>, and
            <b> continuous suspicious activity</b> makes this host a major security risk within the
            system.
            <br />
            <br />
            Additionally, a <b>significant amount of anamolous activity</b> has been detected,
            coming from this user.
            <br />
            <br />
            <b>
              This host represents a major threat within your environment. Would you like to launch
              a case?
            </b>
          </p>
        }
        footer={
          <EuiFlexGroup justifyContent="flexStart">
            <EuiFlexItem grow={false}>
              <EuiButton fill iconType="plusInCircle">
                Create case
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton onClick={showAdjustRiskScoreModal} iconType="documentEdit">
                Adjust risk score
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton onClick={showAddToWatchlistModal} iconType="bell">
                Add to watchlist
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      />
      <EuiSpacer size="l" />
      <ContextsSection<T>
        loading={loadingRiskScore}
        riskScore={riskScore}
        entityType={entityType}
      />
      <EuiSpacer size="l" />
      <WatchlistsSection<T>
        loading={loadingRiskScore}
        riskScore={riskScore}
        entityType={entityType}
      />
      <EuiSpacer size="l" />
      {riskInputsAlertSection('Alerts')}
      <EuiSpacer size="l" />
      {riskInputsAlertSection('Anomalies')}
      <EuiSpacer size="l" />
      {isAddToWatchlistModalVisible && (
        <EuiModal onClose={closeAddToWatchlistModal}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>Add to watchlist</EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            Choose watchlists to add the user to:
            <EuiSpacer />
            <EuiSelectable
              options={watchlistOptions}
              listProps={{ bordered: true }}
              onChange={(newOptions) => setWatchlistOptions(newOptions)}
            >
              {(list) => list}
            </EuiSelectable>
          </EuiModalBody>

          <EuiModalFooter>
            <EuiButton onClick={closeAddToWatchlistModal} fill>
              Apply
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}
      {isAdjustRiskScoreModalVisible && (
        <EuiModal onClose={closeAdjustRiskScoreModal}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>Manually adjust the risk score for this user</EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            <EuiCheckableCard
              name={'something'}
              label={
                <div>
                  <EuiTitle size="m">
                    <h2>Override risk score</h2>
                  </EuiTitle>
                  <EuiText>
                    This option will override this entity's risk score to a static value. Risk
                    inputs will not be visible.
                  </EuiText>

                  <EuiFieldNumber
                    placeholder="A number between 0 and 100"
                    value={overrideValue}
                    onChange={(e) => onChangeOverrideValue(e)}
                  />
                </div>
              }
              value="radio1"
              checked={radio === 'radio1'}
              onChange={() => setRadio('radio1')}
            />

            <EuiSpacer size="m" />

            <EuiCheckableCard
              label={
                <div>
                  <EuiTitle size="m">
                    <h2>Calibrate risk score</h2>
                  </EuiTitle>
                  <EuiText>
                    Adjust the risk score higher or lower according to any known, external
                    information about this user. Uses a simple multiplier against the computed risk
                    score. Note that a risk score will never be below 0 or above 100.
                  </EuiText>
                  <EuiRange
                    min={0}
                    max={10}
                    step={0.1}
                    value={scaleValue}
                    onChange={onChangeScaleValue}
                    showLabels
                    showValue
                    aria-label="An example of EuiRange with showLabels prop"
                  />
                </div>
              }
              name={'something'}
              value="radio2"
              checked={radio === 'radio2'}
              onChange={() => setRadio('radio2')}
            />

            <EuiSpacer size="m" />

            <EuiCheckableCard
              label={
                <div>
                  <EuiTitle size="m">
                    <h2>Remove all adjustments</h2>
                  </EuiTitle>
                </div>
              }
              name={'something'}
              value="radio3"
              checked={radio === 'radio3'}
              onChange={() => setRadio('radio3')}
            />
          </EuiModalBody>

          <EuiModalFooter>
            <EuiButton onClick={closeAdjustRiskScoreModal} fill>
              Apply
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}
    </>
  );
};

RiskInputsTab.displayName = 'RiskInputsTab';

interface ContextsSectionProps<T extends EntityType> {
  riskScore?: EntityRiskScore<T>;
  entityType: T;
  loading: boolean;
}

const ContextsSection = <T extends EntityType>({
  riskScore,
  loading,
  entityType,
}: ContextsSectionProps<T>) => {
  const criticality = useMemo(() => {
    if (!riskScore) {
      return undefined;
    }

    return {
      level: riskScore[entityType].risk.criticality_level,
      contribution: riskScore[entityType].risk.category_2_score,
    };
  }, [entityType, riskScore]);

  if (loading || criticality === undefined) {
    return null;
  }

  return (
    <>
      <EuiTitle size="xs" data-test-subj="risk-input-contexts-title">
        <h3>
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.riskInputs.contextsTitle"
            defaultMessage="Contexts"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiInMemoryTable
        compressed={false}
        loading={loading}
        data-test-subj="risk-input-contexts-table"
        columns={contextColumns}
        items={[
          {
            field: (
              <FormattedMessage
                id="xpack.securitySolution.flyout.entityDetails.riskInputs.assetCriticalityField"
                defaultMessage="Asset Criticality Level"
              />
            ),
            value: (
              <AssetCriticalityBadge
                criticalityLevel={criticality.level}
                dataTestSubj="risk-inputs-asset-criticality-badge"
              />
            ),
            contribution: formatContribution(criticality.contribution || 0),
          },
        ]}
      />
    </>
  );
};

const WatchlistsSection = <T extends EntityType>({
  riskScore,
  loading,
  entityType,
}: ContextsSectionProps<T>) => {
  const criticality = useMemo(() => {
    if (!riskScore) {
      return undefined;
    }

    return {
      level: riskScore[entityType].risk.criticality_level,
      contribution: riskScore[entityType].risk.category_2_score,
    };
  }, [entityType, riskScore]);

  if (loading || criticality === undefined) {
    return null;
  }

  return (
    <>
      <EuiTitle size="xs" data-test-subj="risk-input-contexts-title">
        <h3>
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.riskInputs.contextsTitle"
            defaultMessage="Watchlists"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiInMemoryTable
        compressed={false}
        loading={loading}
        data-test-subj="risk-input-contexts-table"
        columns={watchlistColumns}
        items={[
          {
            watchlist: (
              <FormattedMessage
                id="xpack.securitySolution.flyout.entityDetails.riskInputs.assetCriticalityField"
                defaultMessage="Privileged Users"
              />
            ),
            contribution: formatContribution(criticality.contribution || 0),
          },
        ]}
      />
    </>
  );
};

interface ContextRow {
  field: ReactNode;
  value: ReactNode;
  contribution: string;
}

const contextColumns: Array<EuiBasicTableColumn<ContextRow>> = [
  {
    field: 'field',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.riskInputs.fieldColumn"
        defaultMessage="Field"
      />
    ),
    width: '30%',
    render: (field: ContextRow['field']) => field,
  },
  {
    field: 'value',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.riskInputs.valueColumn"
        defaultMessage="Value"
      />
    ),
    width: '30%',
    render: (val: ContextRow['value']) => val,
  },
  {
    field: 'contribution',
    width: '30%',
    align: 'right',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.riskInputs.contributionColumn"
        defaultMessage="Contribution"
      />
    ),
    render: (score: ContextRow['contribution']) => <EuiBadge color={'default'}>{score}</EuiBadge>,
  },
];

interface WatchlistRow {
  watchlist: ReactNode;
  contribution: string;
}

const watchlistColumns: Array<EuiBasicTableColumn<WatchlistRow>> = [
  {
    field: 'watchlist',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.riskInputs.fieldColumn"
        defaultMessage="Watchlist name"
      />
    ),
    width: '30%',
    render: (watchlist: WatchlistRow['watchlist']) => watchlist,
  },
  {
    field: 'contribution',
    width: '30%',
    align: 'right',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.riskInputs.contributionColumn"
        defaultMessage="Contribution"
      />
    ),
    render: (score: WatchlistRow['contribution']) => <EuiBadge color={'default'}>{score}</EuiBadge>,
  },
];

interface ExtraAlertsMessageProps<T extends EntityType> {
  riskScore?: EntityRiskScore<T>;
  alerts: UseRiskContributingAlertsResult;
  entityType: T;
}

const ExtraAlertsMessage = <T extends EntityType>({
  riskScore,
  alerts,
  entityType,
}: ExtraAlertsMessageProps<T>) => {
  const totals = !riskScore
    ? { count: 0, score: 0 }
    : {
        count: riskScore[entityType].risk.category_1_count,
        score: riskScore[entityType].risk.category_1_score,
      };

  const displayed = {
    count: alerts.data?.length || 0,
    score: alerts.data?.reduce((sum, { input }) => sum + (input.contribution_score || 0), 0) || 0,
  };

  if (displayed.count >= totals.count) {
    return null;
  }
  return (
    <EuiCallOut
      data-test-subj="risk-input-extra-alerts-message"
      size="s"
      title={
        <FormattedMessage
          id="xpack.securitySolution.flyout.entityDetails.riskInputs.extraAlertsMessage"
          defaultMessage="{count} more alerts contributed {score} to the calculated risk score"
          values={{
            count: totals.count - displayed.count,
            score: formatContribution(totals.score - displayed.score),
          }}
        />
      }
      iconType="annotation"
    />
  );
};

const formatContribution = (value: number): string => {
  const fixedValue = formatRiskScore(value);

  // prevent +0.00 for values like 0.0001
  if (fixedValue === '0.00') {
    return fixedValue;
  }

  if (value > 0) {
    return `+${fixedValue}`;
  }

  return fixedValue;
};
