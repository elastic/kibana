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
  EuiCheckbox,
  EuiEmptyPrompt,
  EuiFormErrorText,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIconTip,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import deepEqual from 'fast-deep-equal';
import type { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';
import type { ISearchSource, Query } from '@kbn/data-plugin/common';
import { type SavedQuery } from '@kbn/data-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataViewBase } from '@kbn/es-query';
import { type Filter } from '@kbn/es-query';
import { DataViewSelectPopover } from '@kbn/stack-alerts-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  IErrorObject,
  RuleTypeParams,
  RuleTypeParamsExpressionProps,
} from '@kbn/triggers-actions-ui-plugin/public';
import { ForLastExpression } from '@kbn/triggers-actions-ui-plugin/public';
import type { SearchBarProps } from '@kbn/unified-search-plugin/public';

import { COMPARATORS } from '@kbn/alerting-comparators';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { useKibana } from '../../utils/kibana_react';
import {
  Aggregators,
  type CustomThresholdSearchSourceFields,
} from '../../../common/custom_threshold_rule/types';
import type { TimeUnitChar } from '../../../common/utils/formatters/duration';
import type { AlertContextMeta, AlertParams, MetricExpression } from './types';
import { ExpressionRow } from './components/expression_row';
import type { MetricsExplorerFields } from './components/group_by';
import { GroupBy } from './components/group_by';
import { RuleConditionChart as PreviewChart } from '../rule_condition_chart/rule_condition_chart';
import { getSearchConfiguration } from './helpers/get_search_configuration';

const HIDDEN_FILTER_PANEL_OPTIONS: SearchBarProps['hiddenFilterPanelOptions'] = [
  'pinFilter',
  'disableFilter',
];

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
const EMPTY_FILTERS: Filter[] = [];

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
  const [savedQuery, setSavedQuery] = useState<SavedQuery>();
  const [isNoDataChecked, setIsNoDataChecked] = useState<boolean>(
    (hasGroupBy && !!ruleParams.alertOnGroupDisappear) ||
      (!hasGroupBy && !!ruleParams.alertOnNoData)
  );
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

    if (typeof ruleParams.alertOnNoData === 'undefined') {
      preFillAlertOnNoData();
    }
    if (typeof ruleParams.alertOnGroupDisappear === 'undefined') {
      preFillAlertOnGroupDisappear();
    }
    setIsNoDataChecked(
      (hasGroupBy && !!ruleParams.alertOnGroupDisappear) ||
        (!hasGroupBy && !!ruleParams.alertOnNoData)
    );
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

  // Saved query
  const onSavedQueryUpdated = useCallback(
    (newSavedQuery: SavedQuery) => {
      setSavedQuery(newSavedQuery);
      const { filters: newFilters, query: newQuery } = newSavedQuery.attributes;

      // Only update fields if they are defined
      const updates: Partial<CustomThresholdSearchSourceFields> = {};
      if (newFilters !== undefined) updates.filter = newFilters;
      if (newQuery !== undefined) updates.query = newQuery;

      if (Object.keys(updates).length > 0) {
        setRuleParams(
          'searchConfiguration',
          getSearchConfiguration(
            {
              ...ruleParams.searchConfiguration,
              ...updates,
            },
            setParamsWarning
          )
        );
      }
    },
    [setRuleParams, ruleParams.searchConfiguration]
  );

  const onClearSavedQuery = () => {
    setSavedQuery(undefined);
    setRuleParams(
      'searchConfiguration',
      getSearchConfiguration(
        {
          ...ruleParams.searchConfiguration,
          query: { language: ruleParams.searchConfiguration.query?.language ?? 'kuery', query: '' },
          filter: undefined,
        },
        setParamsWarning
      )
    );
  };

  const onFilterUpdated = useCallback(
    (filter: Filter[]) => {
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
    },
    [setRuleParams, ruleParams.searchConfiguration]
  );

  const onQuerySubmit = useCallback(
    ({ query: newQuery }: { query?: Query }) => {
      setParamsWarning(undefined);
      if (!deepEqual(newQuery, ruleParams.searchConfiguration.query)) {
        setRuleParams(
          'searchConfiguration',
          getSearchConfiguration(
            {
              ...ruleParams.searchConfiguration,
              query: { language: newQuery?.language ?? 'kuery', query: newQuery?.query ?? '' },
            },
            setParamsWarning
          )
        );
      }
    },
    [setRuleParams, ruleParams.searchConfiguration]
  );

  const onQueryChange = useCallback(
    ({ query: newQuery }: { query?: Query }) => {
      setParamsWarning(undefined);
      if (!deepEqual(newQuery, ruleParams.searchConfiguration.query)) {
        setRuleParams(
          'searchConfiguration',
          getSearchConfiguration(
            {
              ...ruleParams.searchConfiguration,
              query: newQuery ?? ruleParams.searchConfiguration.query,
            },
            setParamsWarning
          )
        );
      }
    },
    [setRuleParams, ruleParams.searchConfiguration]
  );

  const debouncedOnQueryChange = useMemo(
    () => debounce(onQueryChange, FILTER_TYPING_DEBOUNCE_MS),
    [onQueryChange]
  );

  const onGroupByChange = useCallback(
    (group: string | null | string[]) => {
      const hasGroup = !!group && group.length > 0;
      setRuleParams('groupBy', group && group.length ? group : '');
      setRuleParams('alertOnGroupDisappear', hasGroup && isNoDataChecked);
      setRuleParams('alertOnNoData', !hasGroup && isNoDataChecked);
    },
    [setRuleParams, isNoDataChecked]
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

  const preFillAlertOnNoData = useCallback(() => {
    const md = metadata;
    if (md && typeof md.currentOptions?.alertOnNoData !== 'undefined') {
      setRuleParams('alertOnNoData', md.currentOptions.alertOnNoData);
    } else {
      setRuleParams('alertOnNoData', false);
    }
  }, [metadata, setRuleParams]);

  const preFillAlertOnGroupDisappear = useCallback(() => {
    const md = metadata;
    if (md && typeof md.currentOptions?.alertOnGroupDisappear !== 'undefined') {
      setRuleParams('alertOnGroupDisappear', md.currentOptions.alertOnGroupDisappear);
    } else {
      setRuleParams('alertOnGroupDisappear', false);
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
        indexPatterns={dataView ? [dataView] : undefined}
        allowSavingQueries
        showQueryInput
        showQueryMenu
        showFilterBar
        showDatePicker={false}
        showSubmitButton={false}
        displayStyle="inPage"
        onQueryChange={debouncedOnQueryChange}
        onQuerySubmit={onQuerySubmit}
        onClearSavedQuery={onClearSavedQuery}
        onSavedQueryUpdated={onSavedQueryUpdated}
        onSaved={onSavedQueryUpdated}
        dataTestSubj="thresholdRuleUnifiedSearchBar"
        query={ruleParams.searchConfiguration?.query}
        filters={ruleParams.searchConfiguration?.filter ?? EMPTY_FILTERS}
        savedQuery={savedQuery}
        onFiltersUpdated={onFilterUpdated}
        hiddenFilterPanelOptions={HIDDEN_FILTER_PANEL_OPTIONS}
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
      <EuiSpacer size="s" />
      <EuiCheckbox
        id="metrics-alert-group-disappear-toggle"
        data-test-subj="thresholdRuleAlertOnNoDataCheckbox"
        label={
          <>
            {i18n.translate(
              'xpack.observability.customThreshold.rule.alertFlyout.alertOnGroupDisappear',
              {
                defaultMessage: "Alert me if there's no data",
              }
            )}{' '}
            <EuiIconTip
              type="question"
              color="subdued"
              content={
                hasGroupBy
                  ? i18n.translate(
                      'xpack.observability.customThreshold.rule.alertFlyout.groupDisappearHelpText',
                      {
                        defaultMessage:
                          'Enable this to trigger a no data alert if a previously detected group begins to report no results. This is not recommended for dynamically scaling infrastructures that may rapidly start and stop nodes automatically.',
                      }
                    )
                  : i18n.translate(
                      'xpack.observability.customThreshold.rule.alertFlyout.noDataHelpText',
                      {
                        defaultMessage:
                          'Enable this to trigger a no data alert if the condition(s) do not report any data over the expected time period, or if the alert fails to query Elasticsearch',
                      }
                    )
              }
            />
          </>
        }
        checked={isNoDataChecked}
        onChange={(e) => {
          const checked = e.target.checked;
          setIsNoDataChecked(checked);
          if (!checked) {
            setRuleParams('alertOnGroupDisappear', false);
            setRuleParams('alertOnNoData', false);
          } else {
            if (hasGroupBy) {
              setRuleParams('alertOnGroupDisappear', true);
              setRuleParams('alertOnNoData', false);
            } else {
              setRuleParams('alertOnGroupDisappear', false);
              setRuleParams('alertOnNoData', true);
            }
          }
        }}
      />
      <EuiSpacer size="m" />
    </>
  );
}
