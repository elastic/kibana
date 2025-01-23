/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFormErrorText,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import useMount from 'react-use/lib/useMount';
import type { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import { ForLastExpression } from '@kbn/triggers-actions-ui-plugin/public';
import type { ResolvedLogViewField } from '@kbn/logs-shared-plugin/common';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import type { ISearchSource } from '@kbn/data-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import { DataViewSelectPopover } from '@kbn/stack-alerts-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  PartialCountRuleParams,
  PartialCriteria as PartialCriteriaType,
  PartialRatioRuleParams,
  PartialRuleParams,
  ThresholdType,
} from '../../../../../common/alerting/logs/log_threshold/types';
import {
  Comparator,
  isOptimizableGroupedThreshold,
  isRatioRule,
  timeUnitRT,
} from '../../../../../common/alerting/logs/log_threshold/types';
import type { ObjectEntries } from '../../../../../common/utility_types';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { GroupByExpression } from '../../../common/group_by_expression/group_by_expression';
import { errorsRT } from '../../validation';
import { Criteria } from './criteria';
import { Threshold } from './threshold';
import { TypeSwitcher } from './type_switcher';
import { getSearchConfiguration } from '../../../common/helpers/get_search_configuration';

export interface ExpressionCriteria {
  field?: string;
  comparator?: Comparator;
  value?: string | number;
}

interface LogsContextMeta {
  isInternal?: boolean;
  adHocDataViewList: DataView[];
}

const DEFAULT_BASE_EXPRESSION = {
  timeSize: 5,
  timeUnit: 'm' as const,
};

const DEFAULT_FIELD = 'log.level';

const createDefaultCriterion = (
  availableFields: ResolvedLogViewField[],
  value: ExpressionCriteria['value']
) =>
  availableFields.some((availableField) => availableField.name === DEFAULT_FIELD)
    ? { field: DEFAULT_FIELD, comparator: Comparator.EQ, value }
    : { field: undefined, comparator: undefined, value: undefined };

const createDefaultCountRuleParams = (
  availableFields: ResolvedLogViewField[]
): PartialCountRuleParams => ({
  ...DEFAULT_BASE_EXPRESSION,
  count: {
    value: 75,
    comparator: Comparator.GT,
  },
  criteria: [createDefaultCriterion(availableFields, 'error')],
});

const createDefaultRatioRuleParams = (
  availableFields: ResolvedLogViewField[]
): PartialRatioRuleParams => ({
  ...DEFAULT_BASE_EXPRESSION,
  count: {
    value: 2,
    comparator: Comparator.GT,
  },
  criteria: [
    [createDefaultCriterion(availableFields, 'error')],
    [createDefaultCriterion(availableFields, 'warning')],
  ],
});

type Props = RuleTypeParamsExpressionProps<PartialRuleParams, LogsContextMeta>;

export const ExpressionEditor: React.FC<Props> = (props) => {
  const {
    services: { data, dataViews, dataViewEditor, spaces },
  } = useKibanaContextForPlugin(); // injected during alert registration

  const { setRuleParams, ruleParams, onChangeMetaData } = props;

  const [dataView, setDataView] = useState<DataView>();
  const [searchSource, setSearchSource] = useState<ISearchSource>();
  const [paramsError, setParamsError] = useState<Error>();
  const [paramsWarning, setParamsWarning] = useState<string>();
  const [dataViewTimeFieldError, setDataViewTimeFieldError] = useState<string>();

  useEffect(() => {
    const initSearchSource = async () => {
      let initialSearchConfiguration = ruleParams.searchConfiguration;

      if (!ruleParams.searchConfiguration || !ruleParams.searchConfiguration.index) {
        const newSearchSource = data.search.searchSource.createEmpty();
        newSearchSource.setField('query', data.query.queryString.getDefaultQuery());

        const spaceId = (await spaces.getActiveSpace()).id;

        let logsDataView;

        try {
          logsDataView = await data.dataViews.get(`log_rules_data_view_${spaceId}`);
        } catch (error) {
          setParamsError(error);
        }

        if (logsDataView) {
          newSearchSource.setField('index', logsDataView);
        }

        initialSearchConfiguration = getSearchConfiguration(
          newSearchSource.getSerializedFields(),
          setParamsWarning
        );
      }

      try {
        const createdSearchSource = await data.search.searchSource.create(
          initialSearchConfiguration
        );
        setRuleParams(
          'searchConfiguration',
          getSearchConfiguration(
            {
              ...initialSearchConfiguration,
              ...(ruleParams.searchConfiguration?.query && {
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
                'xpack.infra.logThreshold.rule.alertFlyout.dataViewError.noTimestamp',
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
      } catch (error) {
        setParamsError(error);
      }
    };

    initSearchSource();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.search.searchSource, data.dataViews]);

  const onSelectDataView = useCallback(
    (newDataView: DataView) => {
      searchSource?.setParent(undefined).setField('index', newDataView);
      setRuleParams(
        'searchConfiguration',
        searchSource && getSearchConfiguration(searchSource.getSerializedFields(), setParamsWarning)
      );
      setDataView(newDataView);
    },
    [searchSource, setRuleParams]
  );

  if (paramsError) {
    return (
      <>
        <EuiCallOut color="danger" iconType="warning" data-test-subj="metricRuleExpressionError">
          <p>{paramsError.message}</p>
        </EuiCallOut>
        <EuiSpacer size={'m'} />
      </>
    );
  }

  if (!searchSource) {
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
            title={i18n.translate('xpack.infra.logThreshold.rule.alertFlyout.warning.title', {
              defaultMessage: 'Warning',
            })}
            color="warning"
            iconType="warning"
            data-test-subj="metricRuleExpressionWarning"
          >
            {paramsWarning}
          </EuiCallOut>
          <EuiSpacer size="s" />
        </>
      )}
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.infra.logThreshold.rule.alertFlyout.selectDataViewPrompt"
            defaultMessage="Select a data view"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <DataViewSelectPopover
        dependencies={{ dataViews, dataViewEditor }}
        dataView={dataView}
        onSelectDataView={onSelectDataView}
        onChangeMetaData={({ adHocDataViewList }) => {
          onChangeMetaData({ adHocDataViewList });
        }}
      />
      {dataViewTimeFieldError && (
        <EuiFormErrorText data-test-subj="metricRuleDataViewErrorNoTimestamp">
          {dataViewTimeFieldError}
        </EuiFormErrorText>
      )}
      <EuiSpacer size="m" />
      <Editor {...props} dataView={dataView} />
    </>
  );
};

export const Editor: React.FC<Props & { dataView?: DataView }> = (props) => {
  const { setRuleParams, ruleParams, errors, dataView } = props;
  const [hasSetDefaults, setHasSetDefaults] = useState<boolean>(false);

  const {
    criteria: criteriaErrors,
    threshold: thresholdErrors,
    timeSizeUnit: timeSizeUnitErrors,
    timeWindowSize: timeWindowSizeErrors,
  } = useMemo(() => decodeOrThrow(errorsRT)(errors), [errors]);

  const supportedFields = useMemo(() => {
    if (dataView?.fields) {
      return dataView.fields.filter((field) => {
        return (field.type === 'string' || field.type === 'number') && field.searchable;
      });
    } else {
      return [];
    }
  }, [dataView]);

  const groupByFields = useMemo(() => {
    if (dataView?.fields) {
      return dataView.fields.filter((field) => {
        return field.type === 'string' && field.aggregatable;
      });
    } else {
      return [];
    }
  }, [dataView]);

  const updateThreshold = useCallback(
    (thresholdParams: any) => {
      const nextThresholdParams = { ...ruleParams.count, ...thresholdParams };
      setRuleParams('count', nextThresholdParams);
    },
    [ruleParams.count, setRuleParams]
  );

  const updateCriteria = useCallback(
    (criteria: PartialCriteriaType) => {
      setRuleParams('criteria', criteria);
    },
    [setRuleParams]
  );

  const updateTimeSize = useCallback(
    (ts: number | undefined) => {
      setRuleParams('timeSize', ts);
    },
    [setRuleParams]
  );

  const updateTimeUnit = useCallback(
    (tu: string) => {
      if (timeUnitRT.is(tu)) {
        setRuleParams('timeUnit', tu);
      }
    },
    [setRuleParams]
  );

  const updateGroupBy = useCallback(
    (groups: string[]) => {
      setRuleParams('groupBy', groups);
    },
    [setRuleParams]
  );

  const defaultCountAlertParams = useMemo(
    () => createDefaultCountRuleParams(supportedFields),
    [supportedFields]
  );

  const updateType = useCallback(
    (type: ThresholdType) => {
      const defaults =
        type === 'count' ? defaultCountAlertParams : createDefaultRatioRuleParams(supportedFields);
      // Reset properties that don't make sense switching from one context to the other
      setRuleParams('count', defaults.count);
      setRuleParams('criteria', defaults.criteria);
    },
    [defaultCountAlertParams, setRuleParams, supportedFields]
  );

  useMount(() => {
    const newAlertParams = { ...defaultCountAlertParams, ...ruleParams };
    for (const [key, value] of Object.entries(newAlertParams) as ObjectEntries<
      typeof newAlertParams
    >) {
      setRuleParams(key, value);
    }
    setHasSetDefaults(true);
  });

  const shouldShowGroupByOptimizationWarning = useMemo(() => {
    const hasSetGroupBy = ruleParams.groupBy && ruleParams.groupBy.length > 0;
    return (
      hasSetGroupBy &&
      ruleParams.count &&
      !isOptimizableGroupedThreshold(ruleParams.count.comparator, ruleParams.count.value)
    );
  }, [ruleParams]);

  // Wait until the alert param defaults have been set
  if (!hasSetDefaults) return null;

  const criteriaComponent = ruleParams.criteria ? (
    <Criteria
      fields={supportedFields}
      criteria={ruleParams.criteria}
      defaultCriterion={defaultCountAlertParams.criteria[0]}
      errors={criteriaErrors}
      ruleParams={ruleParams}
      searchConfiguration={ruleParams.searchConfiguration}
      updateCriteria={updateCriteria}
    />
  ) : null;

  return (
    <>
      <TypeSwitcher criteria={ruleParams.criteria || []} updateType={updateType} />

      {ruleParams.criteria && !isRatioRule(ruleParams.criteria) && criteriaComponent}

      <Threshold
        comparator={ruleParams.count?.comparator}
        value={ruleParams.count?.value}
        updateThreshold={updateThreshold}
        errors={thresholdErrors}
      />

      <ForLastExpression
        timeWindowSize={ruleParams.timeSize}
        timeWindowUnit={ruleParams.timeUnit}
        onChangeWindowSize={updateTimeSize}
        onChangeWindowUnit={updateTimeUnit}
        errors={{ timeWindowSize: timeWindowSizeErrors, timeSizeUnit: timeSizeUnitErrors }}
      />

      <GroupByExpression
        selectedGroups={ruleParams.groupBy}
        onChange={updateGroupBy}
        fields={groupByFields}
      />

      {ruleParams.criteria && isRatioRule(ruleParams.criteria) && criteriaComponent}

      {shouldShowGroupByOptimizationWarning && (
        <>
          <EuiSpacer size="l" />
          <EuiCallOut color="warning">
            {i18n.translate('xpack.infra.logs.alertFlyout.groupByOptimizationWarning', {
              defaultMessage:
                'When setting a "group by" we highly recommend using the "{comparator}" comparator for your threshold. This can lead to significant performance improvements.',
              values: {
                comparator: Comparator.GT,
              },
            })}
          </EuiCallOut>
        </>
      )}

      <EuiSpacer size="l" />
    </>
  );
};

// required for dynamic import
// eslint-disable-next-line import/no-default-export
export default ExpressionEditor;

// NOTE: Temporary until EUI allow empty values in EuiExpression
// components.
export const ExpressionLike = ({ text }: { text: string }) => {
  return (
    <div className="euiExpression euiExpression-isUppercase euiExpression--success">
      <span className="euiExpression__description">{text}</span>
    </div>
  );
};
