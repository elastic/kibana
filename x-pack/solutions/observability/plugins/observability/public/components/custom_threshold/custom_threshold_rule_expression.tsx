/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { debounce } from 'lodash';
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFormErrorText,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIconTip,
  EuiLoadingSpinner,
  EuiPanel,
  EuiRadioGroup,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';
import { ISearchSource, Query } from '@kbn/data-plugin/common';
import { DataView } from '@kbn/data-views-plugin/common';
import { DataViewBase } from '@kbn/es-query';
import { DataViewSelectPopover } from '@kbn/stack-alerts-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  ForLastExpression,
  IErrorObject,
  RuleTypeParams,
  RuleTypeParamsExpressionProps,
} from '@kbn/triggers-actions-ui-plugin/public';

import { COMPARATORS } from '@kbn/alerting-comparators';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { useKibana } from '../../utils/kibana_react';
import { Aggregators, type NoDataBehavior } from '../../../common/custom_threshold_rule/types';
import type { TimeUnitChar } from '../../../common/utils/formatters/duration';
import type { AlertContextMeta, AlertParams, MetricExpression } from './types';
import { ExpressionRow } from './components/expression_row';
import { MetricsExplorerFields, GroupBy } from './components/group_by';
import { RuleConditionChart as PreviewChart } from '../rule_condition_chart/rule_condition_chart';
import { getSearchConfiguration } from './helpers/get_search_configuration';

type Props = Omit<
  RuleTypeParamsExpressionProps<RuleTypeParams & AlertParams, AlertContextMeta>,
  'defaultActionGroupId' | 'actionGroups' | 'charts' | 'data' | 'unifiedSearch'
>;

export const defaultExpression: MetricExpression = {
  comparator: COMPARATORS.GREATER_THAN,
  metrics: [
    {
      name: 'A',
      aggType: Aggregators.COUNT,
    },
  ],
  threshold: [100],
  timeSize: 1,
  timeUnit: 'm',
};

const FILTER_TYPING_DEBOUNCE_MS = 500;

const getNoDataBehaviorOptions = (hasGroupBy: boolean) => [
  {
    id: 'recover',
    label: (
      <>
        {i18n.translate('xpack.observability.customThreshold.rule.noDataBehavior.recover', {
          defaultMessage: 'Recover active alerts',
        })}{' '}
        <EuiIconTip
          size="s"
          type="question"
          color="subdued"
          content={i18n.translate('xpack.observability.customThreshold.rule.recoverHelpText', {
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
        {i18n.translate('xpack.observability.customThreshold.rule.noDataBehavior.alertOnNoData', {
          defaultMessage: 'Alert me about the missing data',
        })}{' '}
        <EuiIconTip
          size="s"
          type="question"
          color="subdued"
          content={
            hasGroupBy
              ? i18n.translate('xpack.observability.customThreshold.rule.groupDisappearHelpText', {
                  defaultMessage:
                    'Get a "no data" alert when a previously detected group stops returning data. This option is not suitable for dynamically scaling infrastructures that may rapidly start and stop nodes automatically.',
                })
              : i18n.translate('xpack.observability.customThreshold.rule.noDataHelpText', {
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
        {i18n.translate('xpack.observability.customThreshold.rule.noDataBehavior.remainActive', {
          defaultMessage: 'Do nothing',
        })}{' '}
        <EuiIconTip
          size="s"
          type="question"
          color="subdued"
          content={i18n.translate('xpack.observability.customThreshold.rule.remainActiveHelpText', {
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

// eslint-disable-next-line import/no-default-export
export default function Expressions(props: Props) {
  const { setRuleParams, ruleParams, errors, metadata, onChangeMetaData } = props;
  const {
    data,
    dataViews,
    dataViewEditor,

    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana().services;

  const hasGroupBy = useMemo<boolean>(
    () => !!ruleParams.groupBy && ruleParams.groupBy.length > 0,
    [ruleParams.groupBy]
  );

  const [timeSize, setTimeSize] = useState<number | undefined>(1);
  const [timeUnit, setTimeUnit] = useState<TimeUnitChar | undefined>('m');
  const [dataView, setDataView] = useState<DataView>();
  const [dataViewTimeFieldError, setDataViewTimeFieldError] = useState<string>();
  const [searchSource, setSearchSource] = useState<ISearchSource>();
  const [triggerResetDataView, setTriggerResetDataView] = useState<boolean>(false);
  const [paramsError, setParamsError] = useState<SavedObjectNotFound>();
  const [paramsWarning, setParamsWarning] = useState<string>();

  const derivedIndexPattern = useMemo<DataViewBase>(
    () => ({
      fields: dataView?.fields || [],
      title: dataView?.getIndexPattern() || 'unknown-index',
    }),
    [dataView]
  );

  const initSearchSource = async (resetDataView: boolean, thisData: DataPublicPluginStart) => {
    let initialSearchConfiguration = resetDataView ? undefined : ruleParams.searchConfiguration;
    if (!initialSearchConfiguration || !initialSearchConfiguration.index) {
      if (!resetDataView && metadata?.currentOptions?.searchConfiguration) {
        initialSearchConfiguration = {
          query: {
            query: ruleParams.searchConfiguration?.query ?? '',
            language: 'kuery',
          },
          ...metadata.currentOptions.searchConfiguration,
        };
      } else {
        const newSearchSource = thisData.search.searchSource.createEmpty();
        newSearchSource.setField('query', thisData.query.queryString.getDefaultQuery());
        const defaultDataView = await thisData.dataViews.getDefaultDataView();
        if (defaultDataView) {
          newSearchSource.setField('index', defaultDataView);
          setDataView(defaultDataView);
        }
        initialSearchConfiguration = getSearchConfiguration(
          newSearchSource.getSerializedFields(),
          setParamsWarning
        );
      }
    }

    try {
      const createdSearchSource = await thisData.search.searchSource.create(
        initialSearchConfiguration
      );
      setRuleParams(
        'searchConfiguration',
        getSearchConfiguration(
          {
            ...initialSearchConfiguration,
            ...(!resetDataView &&
              ruleParams.searchConfiguration?.query && {
                query: ruleParams.searchConfiguration.query,
              }),
          },
          setParamsWarning
        )
      );
      setSearchSource(createdSearchSource);
      setDataView(createdSearchSource.getField('index'));

      if (createdSearchSource.getField('index')) {
        const timeFieldName = createdSearchSource.getField('index')?.timeFieldName;
        if (!timeFieldName) {
          setDataViewTimeFieldError(
            i18n.translate(
              'xpack.observability.customThreshold.rule.alertFlyout.dataViewError.noTimestamp',
              {
                defaultMessage:
                  'The selected data view does not have a timestamp field, please select another data view.',
              }
            )
          );
        } else {
          setDataViewTimeFieldError(undefined);
        }
      } else {
        setDataViewTimeFieldError(undefined);
      }
      setParamsError(undefined);
    } catch (error) {
      setParamsError(error);
    }
  };

  useEffect(() => {
    initSearchSource(false, data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.search.searchSource, data.dataViews, dataView]);

  useEffect(() => {
    if (ruleParams.criteria && ruleParams.criteria.length) {
      setTimeSize(ruleParams.criteria[0].timeSize);
      setTimeUnit(ruleParams.criteria[0].timeUnit);
    } else {
      preFillCriteria();
    }

    if (!ruleParams.groupBy) {
      preFillGroupBy();
    }

    if (typeof ruleParams.noDataBehavior === 'undefined') {
      setRuleParams('noDataBehavior', getNoDataBehaviorValue(ruleParams, hasGroupBy));
    }
  }, [metadata]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSelectDataView = useCallback(
    (newDataView: DataView) => {
      const ruleCriteria = (ruleParams.criteria ? ruleParams.criteria.slice() : []).map(
        (criterion) => {
          criterion.metrics?.forEach((metric) => {
            metric.field = undefined;
          });
          return criterion;
        }
      );
      setRuleParams('criteria', ruleCriteria);
      searchSource?.setParent(undefined).setField('index', newDataView);
      setRuleParams(
        'searchConfiguration',
        searchSource && getSearchConfiguration(searchSource.getSerializedFields(), setParamsWarning)
      );
      setDataView(newDataView);
    },
    [ruleParams.criteria, searchSource, setRuleParams]
  );

  const updateParams = useCallback(
    (id: any, e: MetricExpression) => {
      const ruleCriteria = ruleParams.criteria ? ruleParams.criteria.slice() : [];
      ruleCriteria[id] = e;
      setRuleParams('criteria', ruleCriteria);
    },
    [setRuleParams, ruleParams.criteria]
  );

  const addExpression = useCallback(() => {
    const ruleCriteria = ruleParams.criteria?.slice() || [];
    ruleCriteria.push({
      ...defaultExpression,
      timeSize: timeSize ?? defaultExpression.timeSize,
      timeUnit: timeUnit ?? defaultExpression.timeUnit,
    });
    setRuleParams('criteria', ruleCriteria);
  }, [setRuleParams, ruleParams.criteria, timeSize, timeUnit]);

  const removeExpression = useCallback(
    (id: number) => {
      const ruleCriteria = ruleParams.criteria?.filter((_, index) => index !== id) || [];
      setRuleParams('criteria', ruleCriteria);
    },
    [setRuleParams, ruleParams.criteria]
  );

  const onFilterChange = useCallback(
    ({ query }: { query?: Query }) => {
      setParamsWarning(undefined);
      setRuleParams(
        'searchConfiguration',
        getSearchConfiguration({ ...ruleParams.searchConfiguration, query }, setParamsWarning)
      );
    },
    [setRuleParams, ruleParams.searchConfiguration]
  );

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const debouncedOnFilterChange = useCallback(debounce(onFilterChange, FILTER_TYPING_DEBOUNCE_MS), [
    onFilterChange,
  ]);

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
      const ruleCriteria =
        ruleParams.criteria?.map((c) => ({
          ...c,
          timeSize: ts,
        })) || [];
      setTimeSize(ts || undefined);
      setRuleParams('criteria', ruleCriteria);
    },
    [ruleParams.criteria, setRuleParams]
  );

  const updateTimeUnit = useCallback(
    (tu: string) => {
      const ruleCriteria = (ruleParams.criteria?.map((c) => ({
        ...c,
        timeUnit: tu,
      })) || []) as AlertParams['criteria'];
      setTimeUnit(tu as TimeUnitChar);
      setRuleParams('criteria', ruleCriteria);
    },
    [ruleParams.criteria, setRuleParams]
  );

  const preFillCriteria = useCallback(() => {
    const md = metadata;
    if (md?.currentOptions?.criteria?.length) {
      const { timeSize: prefillTimeSize, timeUnit: prefillTimeUnit } =
        md.currentOptions.criteria[0];
      if (prefillTimeSize) setTimeSize(prefillTimeSize);
      if (prefillTimeUnit) setTimeUnit(prefillTimeUnit);
      setRuleParams(
        'criteria',
        md.currentOptions.criteria.map((criterion) => ({
          ...defaultExpression,
          ...criterion,
        }))
      );
    } else {
      setRuleParams('criteria', [defaultExpression]);
    }
  }, [metadata, setRuleParams]);

  const preFillGroupBy = useCallback(() => {
    const md = metadata;
    if (md && md.currentOptions?.groupBy) {
      setRuleParams('groupBy', md.currentOptions.groupBy);
    }
  }, [metadata, setRuleParams]);

  if (!paramsError && !searchSource) {
    return (
      <>
        <EuiEmptyPrompt title={<EuiLoadingSpinner size="xl" />} />
        <EuiSpacer size="m" />
      </>
    );
  }

  const placeHolder = i18n.translate(
    'xpack.observability.customThreshold.rule.alertFlyout.searchBar.placeholder',
    {
      defaultMessage: 'Search for observability data… (e.g. host.name:host-1)',
    }
  );

  return (
    <>
      {!!paramsWarning && (
        <>
          <EuiCallOut
            title={i18n.translate(
              'xpack.observability.customThreshold.rule.alertFlyout.warning.title',
              {
                defaultMessage: 'Warning',
              }
            )}
            color="warning"
            iconType="warning"
            data-test-subj="thresholdRuleExpressionWarning"
          >
            {paramsWarning}
          </EuiCallOut>
          <EuiSpacer size="s" />
        </>
      )}
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.observability.customThreshold.rule.alertFlyout.selectDataViewPrompt"
            defaultMessage="Select a data view"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      {paramsError && !triggerResetDataView ? (
        <EuiCallOut color="danger" iconType="warning" data-test-subj="thresholdRuleExpressionError">
          <p>
            {i18n.translate('xpack.observability.customThreshold.rule.alertFlyout.error.message', {
              defaultMessage: 'Error fetching search source',
            })}
            <br />
            {i18n.translate(
              'xpack.observability.customThreshold.rule.alertFlyout.error.messageDescription',
              {
                defaultMessage: 'Could not locate that data view (id: {id})',
                values: { id: paramsError?.savedObjectId },
              }
            )}
            <br />
            <EuiButtonEmpty
              data-test-subj="thresholdRuleExpressionErrorButton"
              flush="left"
              onClick={() => {
                initSearchSource(true, data);
                setTriggerResetDataView(true);
              }}
            >
              {i18n.translate(
                'xpack.observability.customThreshold.rule.alertFlyout.error.message',
                {
                  defaultMessage: 'Click here to choose a new data view',
                }
              )}
            </EuiButtonEmpty>
          </p>
        </EuiCallOut>
      ) : (
        <DataViewSelectPopover
          dependencies={{ dataViews, dataViewEditor }}
          dataView={dataView}
          metadata={{ adHocDataViewList: metadata?.adHocDataViewList || [] }}
          onSelectDataView={onSelectDataView}
          onChangeMetaData={({ adHocDataViewList }) => {
            onChangeMetaData({ ...metadata, adHocDataViewList });
          }}
        />
      )}
      {dataViewTimeFieldError && (
        <EuiFormErrorText data-test-subj="thresholdRuleDataViewErrorNoTimestamp">
          {dataViewTimeFieldError}
        </EuiFormErrorText>
      )}
      <EuiSpacer size="l" />
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.observability.customThreshold.rule.alertFlyout.defineTextQueryPrompt"
            defaultMessage="Define query filter (optional)"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <SearchBar
        appName="Custom threshold rule"
        iconType="search"
        placeholder={placeHolder}
        indexPatterns={dataView ? [dataView] : undefined}
        showQueryInput={true}
        showQueryMenu={false}
        showFilterBar={!!ruleParams.searchConfiguration?.filter}
        showDatePicker={false}
        showSubmitButton={false}
        displayStyle="inPage"
        onQueryChange={debouncedOnFilterChange}
        onQuerySubmit={onFilterChange}
        dataTestSubj="thresholdRuleUnifiedSearchBar"
        query={ruleParams.searchConfiguration?.query}
        filters={ruleParams.searchConfiguration?.filter}
        onFiltersUpdated={(filter) => {
          setRuleParams(
            'searchConfiguration',
            getSearchConfiguration(
              {
                ...ruleParams.searchConfiguration,
                filter,
              },
              setParamsWarning
            )
          );
        }}
      />
      {errors.filterQuery && (
        <EuiFormErrorText data-test-subj="thresholdRuleDataViewErrorNoTimestamp">
          {errors.filterQuery as React.ReactNode}
        </EuiFormErrorText>
      )}
      <EuiSpacer size="l" />
      {ruleParams.criteria &&
        ruleParams.criteria.map((e, idx) => {
          return (
            <div key={idx}>
              {idx > 0 && <EuiHorizontalRule margin="s" />}
              <ExpressionRow
                canDelete={(ruleParams.criteria && ruleParams.criteria.length > 1) || false}
                fields={derivedIndexPattern.fields}
                remove={removeExpression}
                addExpression={addExpression}
                key={idx} // idx's don't usually make good key's but here the index has semantic meaning
                expressionId={idx}
                setRuleParams={updateParams}
                errors={(errors[idx] as IErrorObject) || emptyError}
                expression={e || {}}
                dataView={derivedIndexPattern}
                title={
                  ruleParams.criteria.length === 1 ? (
                    <FormattedMessage
                      id="xpack.observability.customThreshold.rule.alertFlyout.setConditions"
                      defaultMessage="Set rule conditions"
                    />
                  ) : (
                    <FormattedMessage
                      id="xpack.observability.customThreshold.rule.alertFlyout.condition"
                      defaultMessage="Condition {conditionNumber}"
                      values={{ conditionNumber: idx + 1 }}
                    />
                  )
                }
              >
                <PreviewChart
                  metricExpression={e}
                  dataView={dataView}
                  searchConfiguration={ruleParams.searchConfiguration}
                  groupBy={ruleParams.groupBy}
                  error={(errors[idx] as IErrorObject) || emptyError}
                  timeRange={{ from: `now-${(timeSize ?? 1) * 20}${timeUnit}`, to: 'now' }}
                />
              </ExpressionRow>
            </div>
          );
        })}

      <ForLastExpression
        timeWindowSize={timeSize}
        timeWindowUnit={timeUnit}
        errors={emptyError}
        onChangeWindowSize={updateTimeSize}
        onChangeWindowUnit={updateTimeUnit}
        display="fullWidth"
      />

      <EuiSpacer size="m" />
      <div>
        <EuiButtonEmpty
          data-test-subj="thresholdRuleExpressionsAddConditionButton"
          color="primary"
          iconSide="left"
          flush="left"
          iconType="plusInCircleFilled"
          onClick={addExpression}
        >
          <FormattedMessage
            id="xpack.observability.customThreshold.rule.alertFlyout.addCondition"
            defaultMessage="Add condition"
          />
        </EuiButtonEmpty>
      </div>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.translate(
          'xpack.observability.customThreshold.rule.alertFlyout.createAlertPerText',
          {
            defaultMessage: 'Group alerts by (optional)',
          }
        )}
        helpText={i18n.translate(
          'xpack.observability.customThreshold.rule.alertFlyout.createAlertPerHelpText',
          {
            defaultMessage:
              'Create an alert for every unique value. For example: "host.id" or "cloud.region".',
          }
        )}
        fullWidth
        display="rowCompressed"
      >
        <GroupBy
          onChange={onGroupByChange}
          fields={derivedIndexPattern.fields as MetricsExplorerFields}
          options={{
            groupBy: ruleParams.groupBy || null,
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
                {i18n.translate('xpack.observability.customThreshold.rule.noDataBehaviorLabel', {
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
          data-test-subj="thresholdRuleAlertOnNoDataRadioGroup"
        />
      </EuiPanel>
      <EuiSpacer size="m" />
    </>
  );
}
