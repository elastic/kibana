/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiSpacer, EuiInMemoryTable, EuiTitle, EuiCallOut } from '@elastic/eui';
import type { ReactNode } from 'react';
import React, { useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import { get } from 'lodash/fp';
import type { CriticalityLevel } from '../../../../../../common/entity_analytics/asset_criticality/types';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
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
import { AskAiAssistant } from './ask_ai_assistant';

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
        render: formatContribution,
      },
    ],
    [scopeId]
  );

  if (riskScoreError) {
    return (
      <EuiCallOut
        announceOnMount
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

  const riskInputsAlertSection = (
    <>
      <EuiTitle size="xs" data-test-subj="risk-input-alert-title">
        <h3>
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.riskInputs.alertsTitle"
            defaultMessage="Alerts"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <RiskInputsUtilityBar riskInputs={selectedItems} />
      <EuiInMemoryTable
        compressed
        loading={loadingRiskScore || alerts.loading}
        items={alerts.data || []}
        columns={inputColumns}
        sorting
        selection={euiTableSelectionProps}
        itemId="_id"
        tableCaption={i18n.translate(
          'xpack.securitySolution.flyout.entityDetails.riskInputs.alertsTableCaption',
          {
            defaultMessage: 'Alerts contributing to the risk score',
          }
        )}
      />
      <EuiSpacer size="s" />
      <ExtraAlertsMessage<T> riskScore={riskScore} alerts={alerts} entityType={entityType} />
    </>
  );

  return (
    <>
      <ContextsSection<T>
        loading={loadingRiskScore}
        riskScore={riskScore}
        entityType={entityType}
      />
      <EuiSpacer size="m" />
      {riskInputsAlertSection}
      <AskAiAssistant entityType={entityType} entityName={entityName} />
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
  const isPrivmonEnabled = useIsExperimentalFeatureEnabled('enableRiskScorePrivmonModifier');
  const contributions = useMemo(() => {
    if (!riskScore) {
      return undefined;
    }

    const privmon = riskScore[entityType].risk.modifiers?.find(
      (mod) => mod.type === 'watchlist' && mod.subtype === 'privmon'
    );
    const criticality = riskScore[entityType].risk.modifiers?.find(
      (mod) => mod.type === 'asset_criticality'
    );

    return {
      criticality: {
        level: isPrivmonEnabled
          ? (criticality?.metadata?.criticality_level as CriticalityLevel)
          : riskScore[entityType].risk.criticality_level,
        contribution: isPrivmonEnabled
          ? criticality?.contribution
          : riskScore[entityType].risk.category_2_score,
      },
      privmon: {
        isPrivileged: privmon ? privmon.metadata?.is_privileged_user : false,
        contribution: privmon?.contribution ?? 0,
      },
    };
  }, [entityType, riskScore, isPrivmonEnabled]);

  if (loading || contributions === undefined) {
    return null;
  }
  const { criticality, privmon } = contributions;

  const items = [
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
  ];

  if (isPrivmonEnabled) {
    items.push({
      field: (
        <FormattedMessage
          id="xpack.securitySolution.flyout.entityDetails.riskInputs.privmonField"
          defaultMessage="Privileged user"
        />
      ),
      value: (
        <FormattedMessage
          id="xpack.securitySolution.flyout.entityDetails.riskInputs.privmonValue"
          defaultMessage="{value}"
          values={{ value: privmon.isPrivileged ? 'Yes' : 'No' }}
        />
      ),
      contribution: formatContribution(privmon.contribution || 0),
    });
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
        compressed={true}
        loading={loading}
        data-test-subj="risk-input-contexts-table"
        columns={contextColumns}
        items={items}
        tableCaption={i18n.translate(
          'xpack.securitySolution.flyout.entityDetails.riskInputs.contextsTableCaption',
          {
            defaultMessage: 'Contextual contributions to the risk score',
          }
        )}
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
    render: (score: ContextRow['contribution']) => score,
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
