/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ChangeEvent } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFieldSearch,
  EuiFormRow,
  EuiIconTip,
  EuiPanel,
  EuiRadioGroup,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  IErrorObject,
  RuleTypeParams,
  RuleTypeParamsExpressionProps,
} from '@kbn/triggers-actions-ui-plugin/public';
import { ForLastExpression } from '@kbn/triggers-actions-ui-plugin/public';
import type { TimeUnitChar } from '@kbn/observability-plugin/common/utils/formatters/duration';
import { COMPARATORS } from '@kbn/alerting-comparators';
import type { GenericAggType } from '@kbn/observability-plugin/public';
import { RuleConditionChart } from '@kbn/observability-plugin/public';
import type { Query } from '@kbn/es-query';
import { UnifiedSearchBar } from '../../../components/shared/unified_search_bar';
import type { NoDataBehavior } from '../../../../common/alerting/metrics';
import { Aggregators, QUERY_INVALID } from '../../../../common/alerting/metrics';
import {
  useMetricsDataViewContext,
  useSourceContext,
  withSourceProvider,
} from '../../../containers/metrics_source';
import { MetricsExplorerGroupBy } from '../../../pages/metrics/metrics_explorer/components/group_by';
import type { MetricsExplorerOptions } from '../../../pages/metrics/metrics_explorer/hooks/use_metrics_explorer_options';
import { convertKueryToElasticSearchQuery } from '../../../utils/kuery';
import type { AlertContextMeta, AlertParams, MetricExpression } from '../types';
import { ExpressionRow } from './expression_row';

type Props = Omit<
  RuleTypeParamsExpressionProps<RuleTypeParams & AlertParams, AlertContextMeta>,
  | 'defaultActionGroupId'
  | 'actionGroups'
  | 'charts'
  | 'data'
  | 'unifiedSearch'
  | 'onChangeMetaData'
  | 'dataViews'
>;

const defaultExpression = {
  aggType: Aggregators.AVERAGE,
  comparator: COMPARATORS.GREATER_THAN,
  threshold: [],
  timeSize: 1,
  timeUnit: 'm',
} as MetricExpression;
export { defaultExpression };

const getNoDataBehaviorOptions = (hasGroupBy: boolean) => [
  {
    id: 'recover',
    label: (
      <>
        {i18n.translate('xpack.infra.metricThreshold.rule.noDataBehavior.recover', {
          defaultMessage: 'Recover active alerts',
        })}{' '}
        <EuiIconTip
          size="s"
          type="question"
          color="subdued"
          content={i18n.translate('xpack.infra.metricThreshold.rule.recoverHelpText', {
            defaultMessage:
              "Recover any active alerts when data isn't returned for the specified conditions. New alerts won't be created for the missing data.",
          })}
        />
      </>
    ),
  },
  {
    id: 'alertOnNoData',
    label: (
      <>
        {i18n.translate('xpack.infra.metricThreshold.rule.noDataBehavior.alertOnNoData', {
          defaultMessage: 'Alert me about the missing data',
        })}{' '}
        <EuiIconTip
          size="s"
          type="question"
          color="subdued"
          content={
            hasGroupBy
              ? i18n.translate('xpack.infra.metricThreshold.rule.groupDisappearHelpText', {
                  defaultMessage:
                    'Get a "no data" alert when a previously detected group stops returning data. This option is not suitable for dynamically scaling infrastructures that may rapidly start and stop nodes automatically.',
                })
              : i18n.translate('xpack.infra.metricThreshold.rule.noDataHelpText', {
                  defaultMessage:
                    'Get a "no data" alert when data isn\'t returned during the rule execution period or if the rule does not successfully query Elasticsearch.',
                })
          }
        />
      </>
    ),
  },
  {
    id: 'remainActive',
    label: (
      <>
        {i18n.translate('xpack.infra.metricThreshold.rule.noDataBehavior.remainActive', {
          defaultMessage: 'Do nothing',
        })}{' '}
        <EuiIconTip
          size="s"
          type="question"
          color="subdued"
          content={i18n.translate('xpack.infra.metricThreshold.rule.remainActiveHelpText', {
            defaultMessage:
              'Keep active alerts in their current state, and do not create new alerts for the missing data.',
          })}
        />
      </>
    ),
  },
];

export const getNoDataBehaviorValue = (
  ruleParams: AlertParams,
  hasGroupBy: boolean
): NoDataBehavior => {
  if (ruleParams.noDataBehavior) {
    return ruleParams.noDataBehavior;
  }

  // Derive from legacy params for backwards compatibility
  if (hasGroupBy) {
    return ruleParams.alertOnGroupDisappear ? 'alertOnNoData' : 'recover';
  }

  return ruleParams.alertOnNoData ? 'alertOnNoData' : 'recover';
};

export const Expressions: React.FC<Props> = (props) => {
  const { setRuleParams, ruleParams, errors, metadata } = props;
  const { source } = useSourceContext();
  const { metricsView } = useMetricsDataViewContext();
  const [timeSize, setTimeSize] = useState<number | undefined>(1);
  const [timeUnit, setTimeUnit] = useState<TimeUnitChar | undefined>('m');

  const hasGroupBy = useMemo(
    () => Boolean(ruleParams.groupBy && ruleParams.groupBy.length > 0),
    [ruleParams.groupBy]
  );

  const options = useMemo<MetricsExplorerOptions>(() => {
    if (metadata?.currentOptions?.metrics) {
      return metadata.currentOptions as MetricsExplorerOptions;
    } else {
      return {
        metrics: [],
        aggregation: 'avg',
      };
    }
  }, [metadata]);

  const updateParams = useCallback(
    (id: any, e: MetricExpression) => {
      const exp = ruleParams.criteria ? ruleParams.criteria.slice() : [];
      exp[id] = e;
      setRuleParams('criteria', exp);
    },
    [setRuleParams, ruleParams.criteria]
  );

  const addExpression = useCallback(() => {
    const exp = ruleParams.criteria?.slice() || [];
    exp.push({
      ...defaultExpression,
      timeSize: timeSize ?? defaultExpression.timeSize,
      timeUnit: timeUnit ?? defaultExpression.timeUnit,
    });
    setRuleParams('criteria', exp);
  }, [setRuleParams, ruleParams.criteria, timeSize, timeUnit]);

  const removeExpression = useCallback(
    (id: number) => {
      const exp = ruleParams.criteria?.slice() || [];
      if (exp.length > 1) {
        exp.splice(id, 1);
        setRuleParams('criteria', exp);
      }
    },
    [setRuleParams, ruleParams.criteria]
  );

  const onFilterChange = useCallback(
    (payload: { query?: Query }) => {
      const kuery = payload.query?.query as string;

      setRuleParams('filterQueryText', kuery);
      try {
        setRuleParams(
          'filterQuery',
          convertKueryToElasticSearchQuery(kuery, metricsView?.dataViewReference, false) || ''
        );
      } catch (e) {
        setRuleParams('filterQuery', QUERY_INVALID);
      }
    },
    [setRuleParams, metricsView?.dataViewReference]
  );

  const onGroupByChange = useCallback(
    (group: string | null | string[]) => {
      setRuleParams('groupBy', group && group.length ? group : '');
    },
    [setRuleParams]
  );

  const emptyError = useMemo(() => {
    return {
      aggField: [],
      timeSizeUnit: [],
      timeWindowSize: [],
    };
  }, []);

  const updateTimeSize = useCallback(
    (ts: number | undefined) => {
      const criteria =
        ruleParams.criteria?.map((c) => ({
          ...c,
          timeSize: ts,
        })) || [];
      setTimeSize(ts || undefined);
      setRuleParams('criteria', criteria);
    },
    [ruleParams.criteria, setRuleParams]
  );

  const updateTimeUnit = useCallback(
    (tu: string) => {
      const criteria =
        ruleParams.criteria?.map((c) => ({
          ...c,
          timeUnit: tu,
        })) || [];
      setTimeUnit(tu as TimeUnitChar);
      setRuleParams('criteria', criteria as AlertParams['criteria']);
    },
    [ruleParams.criteria, setRuleParams]
  );

  const preFillAlertCriteria = useCallback(() => {
    const md = metadata;
    if (md?.currentOptions?.metrics?.length) {
      setRuleParams(
        'criteria',
        md.currentOptions.metrics.map((metric) => ({
          metric: metric.field,
          comparator: COMPARATORS.GREATER_THAN,
          threshold: [],
          timeSize,
          timeUnit,
          aggType: metric.aggregation,
        })) as AlertParams['criteria']
      );
    } else {
      setRuleParams('criteria', [defaultExpression]);
    }
  }, [metadata, setRuleParams, timeSize, timeUnit]);

  const preFillAlertFilter = useCallback(() => {
    const md = metadata;
    if (md && md.currentOptions?.filterQuery) {
      setRuleParams('filterQueryText', md.currentOptions.filterQuery);
      setRuleParams(
        'filterQuery',
        convertKueryToElasticSearchQuery(
          md.currentOptions.filterQuery,
          metricsView?.dataViewReference
        ) || ''
      );
    } else if (md && md.currentOptions?.groupBy && md.series) {
      const { groupBy } = md.currentOptions;
      const filter = Array.isArray(groupBy)
        ? groupBy.map((field, index) => `${field}: "${md.series?.keys?.[index]}"`).join(' and ')
        : `${groupBy}: "${md.series.id}"`;
      setRuleParams('filterQueryText', filter);
      setRuleParams(
        'filterQuery',
        convertKueryToElasticSearchQuery(filter, metricsView?.dataViewReference) || ''
      );
    }
  }, [metadata, metricsView?.dataViewReference, setRuleParams]);

  const preFillAlertGroupBy = useCallback(() => {
    const md = metadata;
    if (md && md.currentOptions?.groupBy && !md.series) {
      setRuleParams('groupBy', md.currentOptions.groupBy);
    }
  }, [metadata, setRuleParams]);

  useEffect(() => {
    if (ruleParams.criteria && ruleParams.criteria.length) {
      setTimeSize(ruleParams.criteria[0].timeSize);
      setTimeUnit(ruleParams.criteria[0].timeUnit);
    } else {
      preFillAlertCriteria();
    }

    if (!ruleParams.filterQuery) {
      preFillAlertFilter();
    }

    if (!ruleParams.groupBy) {
      preFillAlertGroupBy();
    }

    if (!ruleParams.sourceId) {
      setRuleParams('sourceId', source?.id || 'default');
    }

    if (typeof ruleParams.noDataBehavior === 'undefined') {
      setRuleParams('noDataBehavior', getNoDataBehaviorValue(ruleParams, hasGroupBy));
    }
  }, [metadata, source]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFieldSearchChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) =>
      onFilterChange({ query: { query: e.target.value, language: 'kuery' } }),
    [onFilterChange]
  );

  return (
    <>
      <EuiSpacer size="m" />
      <EuiText size="xs">
        <h4>
          <FormattedMessage
            id="xpack.infra.metrics.alertFlyout.conditions"
            defaultMessage="Conditions"
          />
        </h4>
      </EuiText>
      <EuiSpacer size="xs" />
      {metricsView &&
        ruleParams.criteria.map((e, idx) => {
          let metricExpression = [
            {
              aggType: e.aggType as GenericAggType,
              // RuleConditionChart uses A,B,C etc in its parser to identify multiple conditions
              name: String.fromCharCode('A'.charCodeAt(0) + idx),
              field: e.metric || '',
            },
          ];
          if (e.customMetrics) {
            metricExpression = e.customMetrics.map((metric) => ({
              name: metric.name,
              aggType: metric.aggType as GenericAggType,
              field: metric.field || '',
              filter: metric.filter,
            }));
          }
          return (
            <ExpressionRow
              canDelete={(ruleParams.criteria && ruleParams.criteria.length > 1) || false}
              remove={removeExpression}
              addExpression={addExpression}
              key={idx} // idx's don't usually make good key's but here the index has semantic meaning
              expressionId={idx}
              setRuleParams={updateParams}
              errors={(errors[idx] as IErrorObject) || emptyError}
              expression={e || {}}
            >
              <RuleConditionChart
                metricExpression={{
                  metrics: metricExpression,
                  equation: e.equation,
                  threshold: e.threshold,
                  comparator: e.comparator,
                  timeSize,
                  timeUnit,
                  warningComparator: e.warningComparator,
                  warningThreshold: e.warningThreshold,
                }}
                searchConfiguration={{
                  index: metricsView.dataViewReference.id,
                  query: {
                    query: ruleParams.filterQueryText || '',
                    language: 'kuery',
                  },
                }}
                timeRange={{ from: `now-${(timeSize ?? 1) * 20}${timeUnit}`, to: 'now' }}
                error={(errors[idx] as IErrorObject) || emptyError}
                dataView={metricsView.dataViewReference}
                groupBy={ruleParams.groupBy}
              />
            </ExpressionRow>
          );
        })}

      <div style={{ marginLeft: 28 }}>
        <ForLastExpression
          timeWindowSize={timeSize}
          timeWindowUnit={timeUnit}
          errors={emptyError}
          onChangeWindowSize={updateTimeSize}
          onChangeWindowUnit={updateTimeUnit}
        />
      </div>

      <EuiSpacer size="m" />
      <div>
        <EuiButtonEmpty
          aria-label={i18n.translate('xpack.infra.expressions.addconditionButton.ariaLabel', {
            defaultMessage: 'Add condition',
          })}
          data-test-subj="infraExpressionsAddConditionButton"
          color="primary"
          iconSide="left"
          flush="left"
          iconType="plusInCircleFilled"
          onClick={addExpression}
        >
          <FormattedMessage
            id="xpack.infra.metrics.alertFlyout.addCondition"
            defaultMessage="Add condition"
          />
        </EuiButtonEmpty>
      </div>
      <EuiSpacer size="m" />

      <EuiFormRow
        label={i18n.translate('xpack.infra.metrics.alertFlyout.filterLabel', {
          defaultMessage: 'Filter (optional)',
        })}
        helpText={i18n.translate('xpack.infra.metrics.alertFlyout.filterHelpText', {
          defaultMessage: 'Use a KQL expression to limit the scope of your alert trigger.',
        })}
        fullWidth
        display="rowCompressed"
      >
        {(metadata && (
          <UnifiedSearchBar
            onQuerySubmit={onFilterChange}
            useDefaultBehaviors={false}
            query={{ query: ruleParams.filterQueryText || '', language: 'kuery' }}
          />
        )) || (
          <EuiFieldSearch
            data-test-subj="infraExpressionsFieldSearch"
            onChange={handleFieldSearchChange}
            value={ruleParams.filterQueryText}
            fullWidth
          />
        )}
      </EuiFormRow>

      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.translate('xpack.infra.metrics.alertFlyout.createAlertPerText', {
          defaultMessage: 'Group alerts by (optional)',
        })}
        helpText={i18n.translate('xpack.infra.metrics.alertFlyout.createAlertPerHelpText', {
          defaultMessage:
            'Create an alert for every unique value. For example: "host.id" or "cloud.region".',
        })}
        fullWidth
        display="rowCompressed"
      >
        <MetricsExplorerGroupBy
          onChange={onGroupByChange}
          options={{
            ...options,
            groupBy: ruleParams.groupBy || undefined,
          }}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiPanel color="subdued">
        <EuiRadioGroup
          name="noDataBehavior"
          legend={{
            children: (
              <span>
                {i18n.translate('xpack.infra.metrics.alertFlyout.noDataBehaviorLabel', {
                  defaultMessage: 'If there is no data',
                })}
              </span>
            ),
          }}
          options={getNoDataBehaviorOptions(hasGroupBy)}
          idSelected={getNoDataBehaviorValue(ruleParams, hasGroupBy)}
          onChange={(id) => {
            setRuleParams('noDataBehavior', id as NoDataBehavior);
          }}
          data-test-subj="metrics-alert-no-data-behavior"
        />
      </EuiPanel>
    </>
  );
};

// required for dynamic import
// eslint-disable-next-line import/no-default-export
export default withSourceProvider<Props>(Expressions)('default');
