/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DefaultItemAction, EuiBasicTableColumn } from '@elastic/eui';
import { EuiBasicTable, EuiFlexGroup, EuiIcon, EuiText, EuiToolTip } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { rulesLocatorID, type RulesLocatorParams } from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import { sloFeatureId } from '@kbn/observability-plugin/common';
import { useQueryClient } from '@kbn/react-query';
import { RuleFormFlyout } from '@kbn/response-ops-rule-form/flyout';
import { SLO_BURN_RATE_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { ALL_VALUE } from '@kbn/slo-schema';
import { paths } from '@kbn/slo-shared-plugin/common/locators/paths';
import React, { useState } from 'react';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { SloStateBadge, SloStatusBadge } from '../../../../components/slo/slo_badges';
import { SloActiveAlertsBadge } from '../../../../components/slo/slo_badges/slo_active_alerts_badge';
import { SloTagsBadge } from '../../../../components/slo/slo_badges/slo_tags_badge';
import { useActionModal } from '../../../../context/action_modal';
import { sloKeys } from '../../../../hooks/query_key_factory';
import { useFetchActiveAlerts } from '../../../../hooks/use_fetch_active_alerts';
import { useFetchHistoricalSummary } from '../../../../hooks/use_fetch_historical_summary';
import { useFetchRulesForSlo } from '../../../../hooks/use_fetch_rules_for_slo';
import { useGetFilteredRuleTypes } from '../../../../hooks/use_get_filtered_rule_types';
import { useKibana } from '../../../../hooks/use_kibana';
import { usePermissions } from '../../../../hooks/use_permissions';
import { useSpace } from '../../../../hooks/use_space';
import { formatHistoricalData } from '../../../../utils/slo/chart_data_formatter';
import {
  createRemoteSloDeleteUrl,
  createRemoteSloDisableUrl,
  createRemoteSloEditUrl,
  createRemoteSloEnableUrl,
  createRemoteSloResetUrl,
} from '../../../../utils/slo/remote_slo_urls';
import { useUrlSearchState } from '../../hooks/use_url_search_state';
import { SloRemoteBadge } from '../badges/slo_remote_badge';
import { SloRulesBadge } from '../badges/slo_rules_badge';
import { SLOGroupings } from '../common/slo_groupings';
import { SloListEmpty } from '../slo_list_empty';
import { SloListError } from '../slo_list_error';
import { SloSparkline } from '../slo_sparkline';

export interface Props {
  sloList: SLOWithSummaryResponse[];
  loading: boolean;
  error: boolean;
}

export function SloListCompactView({ sloList, loading, error }: Props) {
  const { services } = useKibana();
  const {
    application: { navigateToUrl },
    http: { basePath },
    uiSettings,
    share: {
      url: { locators },
    },
    triggersActionsUi: { ruleTypeRegistry, actionTypeRegistry },
  } = services;
  const spaceId = useSpace();

  const percentFormat = uiSettings.get('format:percent:defaultPattern');
  const sloIdsAndInstanceIds = sloList.map((slo) => [slo.id, slo.instanceId] as [string, string]);

  const { data: permissions } = usePermissions();
  const filteredRuleTypes = useGetFilteredRuleTypes();
  const queryClient = useQueryClient();
  const { triggerAction } = useActionModal();
  const { onStateChange } = useUrlSearchState();

  const handleTagClick = (tag: string) => {
    onStateChange({
      kqlQuery: `slo.tags: "${tag}"`,
    });
  };

  const [sloToAddRule, setSloToAddRule] = useState<SLOWithSummaryResponse | undefined>(undefined);

  const handleSavedRule = () => {
    queryClient.invalidateQueries({ queryKey: sloKeys.rules(), exact: false });
    setSloToAddRule(undefined);
  };

  const { data: activeAlertsBySlo } = useFetchActiveAlerts({ sloIdsAndInstanceIds });
  const { data: rulesBySlo } = useFetchRulesForSlo({
    sloIds: sloIdsAndInstanceIds.map((item) => item[0]),
  });
  const { isLoading: historicalSummaryLoading, data: historicalSummaries = [] } =
    useFetchHistoricalSummary({
      sloList,
    });

  const isRemote = (slo: SLOWithSummaryResponse) => !!slo.remote;
  const hasRemoteKibanaUrl = (slo: SLOWithSummaryResponse) =>
    !!slo.remote && slo.remote.kibanaUrl !== '';

  const buildActionName = (actionName: string) => (slo: SLOWithSummaryResponse) =>
    isRemote(slo) ? (
      <>
        {actionName}
        <EuiIcon
          type="popout"
          size="s"
          css={{
            marginLeft: '10px',
          }}
        />
      </>
    ) : (
      actionName
    );

  const actions: Array<DefaultItemAction<SLOWithSummaryResponse>> = [
    {
      type: 'icon',
      icon: 'inspect',
      name: i18n.translate('xpack.slo.item.actions.details', {
        defaultMessage: 'Details',
      }),
      description: i18n.translate('xpack.slo.item.actions.details', {
        defaultMessage: 'Details',
      }),
      onClick: (slo: SLOWithSummaryResponse) => {
        const sloDetailsUrl = basePath.prepend(
          paths.sloDetails(slo.id, slo.instanceId, slo.remote?.remoteName)
        );
        navigateToUrl(sloDetailsUrl);
      },
    },
    {
      type: 'icon',
      icon: 'pencil',
      name: buildActionName(
        i18n.translate('xpack.slo.item.actions.edit', {
          defaultMessage: 'Edit',
        })
      ),
      description: i18n.translate('xpack.slo.item.actions.edit', {
        defaultMessage: 'Edit',
      }),
      'data-test-subj': 'sloActionsEdit',
      enabled: (slo) =>
        (permissions?.hasAllWriteRequested && !isRemote(slo)) || hasRemoteKibanaUrl(slo),
      onClick: (slo: SLOWithSummaryResponse) => {
        const remoteEditUrl = createRemoteSloEditUrl(slo, spaceId);
        if (!!remoteEditUrl) {
          window.open(remoteEditUrl, '_blank');
        } else {
          navigateToUrl(basePath.prepend(paths.sloEdit(slo.id)));
        }
      },
    },
    {
      type: 'icon',
      icon: 'bell',
      name: i18n.translate('xpack.slo.item.actions.createRule', {
        defaultMessage: 'Create new alert rule',
      }),
      description: i18n.translate('xpack.slo.item.actions.createRule', {
        defaultMessage: 'Create new alert rule',
      }),
      'data-test-subj': 'sloActionsCreateRule',
      enabled: (slo: SLOWithSummaryResponse) =>
        !!permissions?.hasAllWriteRequested && !isRemote(slo),
      onClick: (slo: SLOWithSummaryResponse) => {
        setSloToAddRule(slo);
      },
    },
    {
      type: 'icon',
      icon: 'gear',
      name: i18n.translate('xpack.slo.item.actions.manageRules', {
        defaultMessage: 'Manage rules',
      }),
      description: i18n.translate('xpack.slo.item.actions.manageRules', {
        defaultMessage: 'Manage rules',
      }),
      'data-test-subj': 'sloActionsManageRules',
      enabled: (slo: SLOWithSummaryResponse) =>
        !!permissions?.hasAllWriteRequested && !isRemote(slo),
      onClick: (slo: SLOWithSummaryResponse) => {
        const locator = locators.get<RulesLocatorParams>(rulesLocatorID);
        locator?.navigate({ params: { sloId: slo.id } }, { replace: false });
      },
    },
    {
      type: 'icon',
      icon: (slo: SLOWithSummaryResponse) => (slo.enabled ? 'stop' : 'play'),
      name: (slo: SLOWithSummaryResponse) =>
        buildActionName(
          slo.enabled
            ? i18n.translate('xpack.slo.item.actions.disable', {
                defaultMessage: 'Disable',
              })
            : i18n.translate('xpack.slo.item.actions.enable', {
                defaultMessage: 'Enable',
              })
        )(slo),
      description: (slo: SLOWithSummaryResponse) =>
        slo.enabled
          ? i18n.translate('xpack.slo.item.actions.disable', {
              defaultMessage: 'Disable',
            })
          : i18n.translate('xpack.slo.item.actions.enable', {
              defaultMessage: 'Enable',
            }),
      'data-test-subj': 'sloActionsManage',
      enabled: (slo: SLOWithSummaryResponse) =>
        (permissions?.hasAllWriteRequested && !isRemote(slo)) || hasRemoteKibanaUrl(slo),
      onClick: (slo: SLOWithSummaryResponse) => {
        const isEnabled = slo.enabled;
        const remoteUrl = isEnabled
          ? createRemoteSloDisableUrl(slo, spaceId)
          : createRemoteSloEnableUrl(slo, spaceId);
        if (!!remoteUrl) {
          window.open(remoteUrl, '_blank');
        } else {
          triggerAction({ item: slo, type: isEnabled ? 'disable' : 'enable' });
        }
      },
    },
    {
      type: 'icon',
      icon: 'copy',
      name: buildActionName(
        i18n.translate('xpack.slo.item.actions.clone', {
          defaultMessage: 'Clone',
        })
      ),
      description: i18n.translate('xpack.slo.item.actions.clone', {
        defaultMessage: 'Clone',
      }),
      'data-test-subj': 'sloActionsClone',
      enabled: (slo: SLOWithSummaryResponse) =>
        (permissions?.hasAllWriteRequested && !isRemote(slo)) || hasRemoteKibanaUrl(slo),
      onClick: (slo: SLOWithSummaryResponse) => {
        triggerAction({ item: slo, type: 'clone' });
      },
    },
    {
      type: 'icon',
      icon: 'trash',
      name: buildActionName(
        i18n.translate('xpack.slo.item.actions.delete', {
          defaultMessage: 'Delete',
        })
      ),
      description: i18n.translate('xpack.slo.item.actions.delete', {
        defaultMessage: 'Delete',
      }),
      'data-test-subj': 'sloActionsDelete',
      enabled: (slo: SLOWithSummaryResponse) =>
        (permissions?.hasAllWriteRequested && !isRemote(slo)) || hasRemoteKibanaUrl(slo),
      onClick: (slo: SLOWithSummaryResponse) => {
        const remoteDeleteUrl = createRemoteSloDeleteUrl(slo, spaceId);
        if (!!remoteDeleteUrl) {
          window.open(remoteDeleteUrl, '_blank');
        } else {
          triggerAction({ item: slo, type: 'delete' });
        }
      },
    },
    {
      type: 'icon',
      icon: 'refresh',
      name: buildActionName(
        i18n.translate('xpack.slo.item.actions.reset', {
          defaultMessage: 'Reset',
        })
      ),
      description: i18n.translate('xpack.slo.item.actions.reset', {
        defaultMessage: 'Reset',
      }),
      'data-test-subj': 'sloActionsReset',
      enabled: (slo: SLOWithSummaryResponse) =>
        (permissions?.hasAllWriteRequested && !isRemote(slo)) || hasRemoteKibanaUrl(slo),
      onClick: (slo: SLOWithSummaryResponse) => {
        const remoteResetUrl = createRemoteSloResetUrl(slo, spaceId);
        if (!!remoteResetUrl) {
          window.open(remoteResetUrl, '_blank');
        } else {
          triggerAction({ item: slo, type: 'reset' });
        }
      },
    },
  ];

  const columns: Array<EuiBasicTableColumn<SLOWithSummaryResponse>> = [
    {
      field: 'status',
      name: 'Status',
      render: (_, slo: SLOWithSummaryResponse) => (
        <EuiFlexGroup direction="row" gutterSize="s">
          <SloStatusBadge slo={slo} />
          <SloStateBadge slo={slo} />
          <SloRemoteBadge slo={slo} />
        </EuiFlexGroup>
      ),
    },
    {
      field: 'alerts',
      name: 'Alerts',
      truncateText: true,
      width: '5%',
      render: (_, slo: SLOWithSummaryResponse) => (
        <>
          <SloRulesBadge
            rules={rulesBySlo?.[slo.id]}
            onClick={() => setSloToAddRule(slo)}
            isRemote={!!slo.remote}
          />
          <SloActiveAlertsBadge
            slo={slo}
            activeAlerts={activeAlertsBySlo.get(slo)}
            viewMode="compact"
          />
        </>
      ),
    },
    {
      field: 'name',
      name: 'Name',
      width: '15%',
      truncateText: { lines: 2 },
      'data-test-subj': 'sloItem',
      render: (_, slo: SLOWithSummaryResponse) => {
        const sloDetailsUrl = basePath.prepend(
          paths.sloDetails(slo.id, slo.instanceId, slo.remote?.remoteName)
        );
        return (
          <EuiToolTip position="top" content={slo.name} display="block">
            <EuiText size="s" tabIndex={0}>
              <a data-test-subj="o11ySloListItemLink" href={sloDetailsUrl}>
                {slo.name}
              </a>
            </EuiText>
          </EuiToolTip>
        );
      },
    },
    {
      field: 'tags',
      name: 'Tags',
      render: (_, slo: SLOWithSummaryResponse) => (
        <EuiFlexGroup gutterSize="xs" direction="row" responsive wrap alignItems="center">
          <SloTagsBadge slo={slo} onClick={handleTagClick} />
        </EuiFlexGroup>
      ),
    },
    {
      field: 'instance',
      name: 'Instance',
      render: (_, slo: SLOWithSummaryResponse) => {
        const groups = [slo.groupBy].flat();
        return !groups.includes(ALL_VALUE) ? (
          <SLOGroupings slo={slo} direction="column" gutterSize={'none'} />
        ) : (
          <span>{NOT_AVAILABLE_LABEL}</span>
        );
      },
    },
    {
      field: 'objective',
      name: 'Objective',
      render: (_, slo: SLOWithSummaryResponse) => numeral(slo.objective.target).format('0.00%'),
    },
    {
      field: 'sli',
      name: 'SLI value',
      truncateText: true,
      render: (_, slo: SLOWithSummaryResponse) =>
        slo.summary.status === 'NO_DATA'
          ? NOT_AVAILABLE_LABEL
          : numeral(slo.summary.sliValue).format(percentFormat),
    },
    {
      field: 'historicalSli',
      name: 'Historical SLI',
      render: (_, slo: SLOWithSummaryResponse) => {
        const isSloFailed = ['VIOLATED', 'DEGRADING'].includes(slo.summary.status);
        const historicalSliData = formatHistoricalData(
          historicalSummaries.find(
            (historicalSummary) =>
              historicalSummary.sloId === slo.id && historicalSummary.instanceId === slo.instanceId
          )?.data,
          'sli_value'
        );
        return (
          <SloSparkline
            chart="line"
            id="sli_history"
            size="compact"
            state={isSloFailed ? 'error' : 'success'}
            data={historicalSliData}
            isLoading={historicalSummaryLoading}
          />
        );
      },
    },
    {
      field: 'errorBudgetRemaining',
      name: 'Budget remaining',
      truncateText: true,
      render: (_, slo: SLOWithSummaryResponse) =>
        slo.summary.status === 'NO_DATA'
          ? NOT_AVAILABLE_LABEL
          : numeral(slo.summary.errorBudget.remaining).format(percentFormat),
    },
    {
      field: 'historicalErrorBudgetRemaining',
      name: 'Historical budget remaining',
      render: (_, slo: SLOWithSummaryResponse) => {
        const isSloFailed = ['VIOLATED', 'DEGRADING'].includes(slo.summary.status);
        const errorBudgetBurnDownData = formatHistoricalData(
          historicalSummaries.find(
            (historicalSummary) =>
              historicalSummary.sloId === slo.id && historicalSummary.instanceId === slo.instanceId
          )?.data,
          'error_budget_remaining'
        );
        return (
          <SloSparkline
            chart="area"
            id="error_budget_burn_down"
            state={isSloFailed ? 'error' : 'success'}
            size="compact"
            data={errorBudgetBurnDownData}
            isLoading={historicalSummaryLoading}
          />
        );
      },
    },

    {
      name: 'Actions',
      actions,
      width: '5%',
    },
  ];

  if (!loading && !error && sloList.length === 0) {
    return <SloListEmpty />;
  }

  if (!loading && error) {
    return <SloListError />;
  }

  return (
    <>
      <EuiBasicTable<SLOWithSummaryResponse>
        items={sloList}
        columns={columns}
        loading={loading}
        noItemsMessage={loading ? LOADING_SLOS_LABEL : NO_SLOS_FOUND}
        tableLayout="auto"
        tableCaption={i18n.translate('xpack.slo.sloListCompactView.tableCaption', {
          defaultMessage: 'Compact SLO list',
        })}
      />
      {sloToAddRule ? (
        <RuleFormFlyout
          plugins={{ ...services, ruleTypeRegistry, actionTypeRegistry }}
          consumer={sloFeatureId}
          filteredRuleTypes={filteredRuleTypes}
          ruleTypeId={SLO_BURN_RATE_RULE_TYPE_ID}
          initialValues={{
            name: `${sloToAddRule.name} burn rate rule`,
            params: { sloId: sloToAddRule.id },
          }}
          onSubmit={handleSavedRule}
          onCancel={() => {
            setSloToAddRule(undefined);
          }}
          shouldUseRuleProducer
        />
      ) : null}
    </>
  );
}

const LOADING_SLOS_LABEL = i18n.translate('xpack.slo.loadingSlosLabel', {
  defaultMessage: 'Loading SLOs ...',
});

const NO_SLOS_FOUND = i18n.translate('xpack.slo.noSlosFound', { defaultMessage: 'No SLOs found' });
