/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHealth,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ReactElement } from 'react';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { AggregationType, IErrorObject } from '@kbn/triggers-actions-ui-plugin/public';
import { ThresholdExpression } from '@kbn/triggers-actions-ui-plugin/public';
import type { DataViewBase, DataViewFieldBase } from '@kbn/es-query';
import { debounce, omit } from 'lodash';
import { COMPARATORS } from '@kbn/alerting-comparators';
import type { KqlPluginStart } from '@kbn/kql/public';
import { builtInComparatorsWithInclusive } from '../../../constants/comparators';
import { convertToBuiltInComparators } from '../../../../common/utils/convert_legacy_outside_comparator';
import { Aggregators } from '../../../../common/custom_threshold_rule/types';
import type { MetricExpression } from '../types';
import { CustomEquationEditor } from './custom_equation';
import { CUSTOM_EQUATION, LABEL_HELP_MESSAGE, LABEL_LABEL } from '../i18n_strings';
import { decimalToPct, pctToDecimal } from '../helpers/corrected_percent_convert';
import { isPercent } from '../helpers/threshold_unit';

interface ExpressionRowProps {
  title: ReactElement;
  fields: DataViewFieldBase[];
  expressionId: number;
  expression: MetricExpression;
  errors: IErrorObject;
  canDelete: boolean;
  addExpression(): void;
  remove(id: number): void;
  setRuleParams(id: number, params: MetricExpression): void;
  dataView: DataViewBase;
  children?: React.ReactNode;
  kql: KqlPluginStart;
}

// eslint-disable-next-line react/function-component-definition
export const ExpressionRow: React.FC<ExpressionRowProps> = (props) => {
  const {
    dataView,
    children,
    setRuleParams,
    expression,
    errors,
    expressionId,
    remove,
    fields,
    canDelete,
    title,
    kql,
  } = props;

  const {
    metrics,
    comparator = COMPARATORS.GREATER_THAN,
    threshold = [],
    warningThreshold = [],
    warningComparator,
  } = expression;
  const isMetricPct = useMemo(() => isPercent(metrics), [metrics]);
  const [label, setLabel] = useState<string | undefined>(expression?.label || undefined);
  const [displayWarningThreshold, setDisplayWarningThreshold] = useState(
    Boolean(warningThreshold?.length)
  );
  // Only true for the render where the user just clicked "Add warning
  // threshold" in this session — distinct from displayWarningThreshold, which
  // is also true when opening the form for a rule that already has one
  // configured. Drives whether the new row's value popover auto-opens: we
  // want that on first add, not every time the form happens to render.
  const [warningJustAdded, setWarningJustAdded] = useState(false);

  // Keep a ref that always points to the latest expression prop so debounced
  // callbacks never close over a stale snapshot.
  const expressionRef = useRef(expression);
  expressionRef.current = expression;

  const updateComparator = useCallback(
    (c?: string) => {
      setRuleParams(expressionId, { ...expression, comparator: c as COMPARATORS });
    },
    [expressionId, expression, setRuleParams]
  );

  const convertThreshold = useCallback(
    (enteredThreshold: any) =>
      isMetricPct ? enteredThreshold.map((v: number) => pctToDecimal(v)) : enteredThreshold,
    [isMetricPct]
  );

  const updateThreshold = useCallback(
    (enteredThreshold: any) => {
      const t = convertThreshold(enteredThreshold);
      if (t.join() !== expression.threshold.join()) {
        setRuleParams(expressionId, { ...expression, threshold: t });
      }
    },
    [expressionId, expression, convertThreshold, setRuleParams]
  );

  const updateWarningComparator = useCallback(
    (c?: string) => {
      setRuleParams(expressionId, { ...expression, warningComparator: c as COMPARATORS });
    },
    [expressionId, expression, setRuleParams]
  );

  const updateWarningThreshold = useCallback(
    (enteredThreshold: any) => {
      const t = convertThreshold(enteredThreshold);
      if (t.join() !== expression.warningThreshold?.join()) {
        setRuleParams(expressionId, { ...expression, warningThreshold: t });
      }
    },
    [expressionId, expression, convertThreshold, setRuleParams]
  );

  const toggleWarningThreshold = useCallback(() => {
    if (!displayWarningThreshold) {
      setDisplayWarningThreshold(true);
      setWarningJustAdded(true);
      setRuleParams(expressionId, {
        ...expression,
        warningComparator: comparator,
        warningThreshold: [],
      });
    } else {
      setDisplayWarningThreshold(false);
      setWarningJustAdded(false);
      setRuleParams(expressionId, omit(expression, 'warningComparator', 'warningThreshold'));
    }
  }, [
    displayWarningThreshold,
    setDisplayWarningThreshold,
    setRuleParams,
    comparator,
    expression,
    expressionId,
  ]);

  const handleCustomMetricChange = useCallback(
    (exp: any) => {
      setRuleParams(expressionId, exp);
    },
    [expressionId, setRuleParams]
  );
  // Pass only the new label value; read the rest of the expression from the ref
  // at fire time so the 300ms delay never overwrites unrelated fields.
  const debouncedLabelChange = useMemo(
    () =>
      debounce((labelValue: string) => {
        setRuleParams(expressionId, { ...expressionRef.current, label: labelValue });
      }, 300),
    // expressionRef is a stable ref object; expressionId and setRuleParams are stable too

    [expressionId, setRuleParams]
  );

  const criticalThresholdExpression = (
    <ThresholdElement
      comparator={comparator}
      threshold={threshold}
      updateComparator={updateComparator}
      updateThreshold={updateThreshold}
      errors={(errors.critical as IErrorObject) ?? {}}
      isMetricPct={isMetricPct}
      badge={
        displayWarningThreshold && (
          <EuiHealth color="danger" style={{ marginLeft: 8 }}>
            <span>
              <FormattedMessage
                id="xpack.observability.customThreshold.rule.alertFlyout.criticalThreshold"
                defaultMessage="Alert"
              />{' '}
              <span style={{ fontSize: '0.8em', opacity: 0.65 }}>
                <FormattedMessage
                  id="xpack.observability.customThreshold.rule.alertFlyout.criticalThresholdSeverityLabel"
                  defaultMessage="(severity: critical)"
                />
              </span>
            </span>
          </EuiHealth>
        )
      }
    />
  );

  const warningThresholdExpression = displayWarningThreshold && (
    <ThresholdElement
      comparator={warningComparator || comparator}
      threshold={warningThreshold}
      updateComparator={updateWarningComparator}
      updateThreshold={updateWarningThreshold}
      errors={(errors.warning as IErrorObject) ?? {}}
      isMetricPct={isMetricPct}
      initialPopoverOpen={warningJustAdded}
      badge={
        <EuiHealth color="warning" style={{ marginLeft: 8 }}>
          <FormattedMessage
            id="xpack.observability.customThreshold.rule.alertFlyout.warningThreshold"
            defaultMessage="Warning"
          />
        </EuiHealth>
      }
    />
  );

  const normalizedFields = fields.map((f) => ({
    normalizedType: f.type,
    esTypes: f.esTypes,
    name: f.name,
  }));

  const handleLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLabel(e.target.value);
      debouncedLabelChange(e.target.value);
    },
    [debouncedLabelChange]
  );
  return (
    <>
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiFlexItem grow>
          <EuiTitle size="xs">
            <h5>{title}</h5>
          </EuiTitle>
        </EuiFlexItem>
        {canDelete && (
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={i18n.translate(
                'xpack.observability.customThreshold.rule.alertFlyout.removeCondition',
                {
                  defaultMessage: 'Remove condition',
                }
              )}
              disableScreenReaderOutput
            >
              <EuiButtonIcon
                data-test-subj="o11yExpressionRowButton"
                aria-label={i18n.translate(
                  'xpack.observability.customThreshold.rule.alertFlyout.removeCondition',
                  {
                    defaultMessage: 'Remove condition',
                  }
                )}
                color={'text'}
                iconType={'trash'}
                onClick={() => remove(expressionId)}
              />
            </EuiToolTip>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiFlexGroup gutterSize="xs">
        <EuiFlexItem grow>
          <>
            <EuiSpacer size={'xs'} />
            <CustomEquationEditor
              expression={expression}
              fields={normalizedFields}
              aggregationTypes={aggregationType}
              onChange={handleCustomMetricChange}
              errors={errors}
              dataView={dataView}
              kql={kql}
            />
            {!displayWarningThreshold && criticalThresholdExpression}
            {!displayWarningThreshold && (
              <EuiFlexGroup alignItems="center">
                <EuiButtonEmpty
                  data-test-subj="o11yExpressionRowAddWarningThresholdButton"
                  color={'primary'}
                  flush={'left'}
                  size="xs"
                  iconType={'plusCircle'}
                  onClick={toggleWarningThreshold}
                >
                  <FormattedMessage
                    id="xpack.observability.customThreshold.rule.alertFlyout.addWarningThreshold"
                    defaultMessage="Add warning threshold"
                  />
                </EuiButtonEmpty>
              </EuiFlexGroup>
            )}
            {displayWarningThreshold && (
              <>
                {criticalThresholdExpression}
                {/* Not a flex sibling: EuiExpression's "columns" display sizes its
                    description column as a percentage of its OWN container, so
                    sharing this row with another flex item (even grow={false})
                    narrows that container and shifts the text left relative to
                    the other rows. Overlaying keeps this box's width identical
                    to the others. */}
                <div style={{ position: 'relative' }}>
                  {warningThresholdExpression}
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      right: 8,
                      transform: 'translateY(-50%)',
                    }}
                  >
                    <EuiToolTip
                      content={i18n.translate(
                        'xpack.observability.customThreshold.rule.alertFlyout.removeWarningThreshold',
                        { defaultMessage: 'Remove warning threshold' }
                      )}
                      disableScreenReaderOutput
                    >
                      <EuiButtonIcon
                        data-test-subj="o11yExpressionRowRemoveWarningThresholdButton"
                        aria-label={i18n.translate(
                          'xpack.observability.customThreshold.rule.alertFlyout.removeWarningThreshold',
                          { defaultMessage: 'Remove warning threshold' }
                        )}
                        iconSize="s"
                        color="text"
                        iconType={'minusCircle'}
                        onClick={toggleWarningThreshold}
                      />
                    </EuiToolTip>
                  </div>
                </div>
              </>
            )}
            <EuiSpacer size={'s'} />
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFormRow label={LABEL_LABEL} fullWidth helpText={LABEL_HELP_MESSAGE}>
                  <EuiFieldText
                    data-test-subj="thresholdRuleCustomEquationEditorFieldTextLabel"
                    compressed
                    fullWidth
                    value={label}
                    placeholder={CUSTOM_EQUATION}
                    onChange={handleLabelChange}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
          </>
        </EuiFlexItem>
      </EuiFlexGroup>
      {children}
    </>
  );
};

const ThresholdElement: React.FC<{
  updateComparator: (c?: string) => void;
  updateThreshold: (t?: number[]) => void;
  threshold: MetricExpression['threshold'];
  isMetricPct: boolean;
  comparator: MetricExpression['comparator'];
  errors: IErrorObject;
  // Only relevant when this row can be toggled on/off (the warning row):
  // open the value popover immediately on mount so the newly-added row isn't
  // left showing an empty, unexplained invalid state. Must only be passed as
  // true for the render where the row was just added, not on every mount
  // (e.g. opening the form for a rule that already has one configured).
  initialPopoverOpen?: boolean;
  // Rendered inside the threshold expression's own button, right after the
  // value — must stay non-interactive (see ThresholdExpressionProps.badge).
  badge?: React.ReactNode;
  // eslint-disable-next-line react/function-component-definition
}> = ({
  updateComparator,
  updateThreshold,
  threshold,
  isMetricPct,
  comparator,
  errors,
  initialPopoverOpen,
  badge,
}) => {
  const displayedThreshold = useMemo(() => {
    if (isMetricPct) return threshold.map((v) => decimalToPct(v));
    return threshold;
  }, [threshold, isMetricPct]);

  const thresholdComparator = useCallback(() => {
    if (!comparator) return COMPARATORS.GREATER_THAN;
    // Check if the rule had a legacy OUTSIDE_RANGE inside its params.
    // Then, change it on-the-fly to NOT_BETWEEN
    return convertToBuiltInComparators(comparator);
  }, [comparator]);
  return (
    <>
      <ThresholdExpression
        customComparators={builtInComparatorsWithInclusive}
        thresholdComparator={thresholdComparator()}
        threshold={displayedThreshold}
        onChangeSelectedThresholdComparator={updateComparator}
        onChangeSelectedThreshold={updateThreshold}
        errors={errors}
        display="fullWidth"
        initialPopoverOpen={initialPopoverOpen}
        unit={isMetricPct ? '%' : ''}
        badge={badge}
      />
    </>
  );
};

export const aggregationType: { [key: string]: AggregationType } = {
  avg: {
    text: i18n.translate(
      'xpack.observability.customThreshold.rule.alertFlyout.aggregationText.avg',
      {
        defaultMessage: 'Average',
      }
    ),
    fieldRequired: true,
    validNormalizedTypes: ['number', 'histogram'],
    value: Aggregators.AVERAGE,
  },
  max: {
    text: i18n.translate(
      'xpack.observability.customThreshold.rule.alertFlyout.aggregationText.max',
      {
        defaultMessage: 'Max',
      }
    ),
    fieldRequired: true,
    validNormalizedTypes: ['number', 'date', 'histogram'],
    value: Aggregators.MAX,
  },
  min: {
    text: i18n.translate(
      'xpack.observability.customThreshold.rule.alertFlyout.aggregationText.min',
      {
        defaultMessage: 'Min',
      }
    ),
    fieldRequired: true,
    validNormalizedTypes: ['number', 'date', 'histogram'],
    value: Aggregators.MIN,
  },
  median: {
    text: i18n.translate(
      'xpack.observability.customThreshold.rule.alertFlyout.aggregationText.median',
      {
        defaultMessage: 'Median',
      }
    ),
    fieldRequired: true,
    validNormalizedTypes: ['number', 'histogram'],
    value: Aggregators.MED,
  },
  cardinality: {
    text: i18n.translate(
      'xpack.observability.customThreshold.rule.alertFlyout.aggregationText.cardinality',
      {
        defaultMessage: 'Cardinality',
      }
    ),
    fieldRequired: false,
    value: Aggregators.CARDINALITY,
    validNormalizedTypes: ['number', 'string', 'ip', 'date'],
  },
  count: {
    text: i18n.translate(
      'xpack.observability.customThreshold.rule.alertFlyout.aggregationText.count',
      {
        defaultMessage: 'Count',
      }
    ),
    fieldRequired: false,
    value: Aggregators.COUNT,
    validNormalizedTypes: ['number'],
  },
  sum: {
    text: i18n.translate(
      'xpack.observability.customThreshold.rule.alertFlyout.aggregationText.sum',
      {
        defaultMessage: 'Sum',
      }
    ),
    fieldRequired: false,
    value: Aggregators.SUM,
    validNormalizedTypes: ['number', 'histogram'],
  },
  p95: {
    text: i18n.translate(
      'xpack.observability.customThreshold.rule.alertFlyout.aggregationText.p95',
      { defaultMessage: '95th Percentile' }
    ),
    fieldRequired: false,
    value: Aggregators.P95,
    validNormalizedTypes: ['number', 'histogram'],
  },
  p99: {
    text: i18n.translate(
      'xpack.observability.customThreshold.rule.alertFlyout.aggregationText.p99',
      { defaultMessage: '99th Percentile' }
    ),
    fieldRequired: false,
    value: Aggregators.P99,
    validNormalizedTypes: ['number', 'histogram'],
  },
  rate: {
    text: i18n.translate(
      'xpack.observability..customThreshold.rule.alertFlyout.aggregationText.rate',
      { defaultMessage: 'Rate' }
    ),
    fieldRequired: false,
    value: Aggregators.RATE,
    validNormalizedTypes: ['number'],
  },
  last_value: {
    text: i18n.translate(
      'xpack.observability..customThreshold.rule.alertFlyout.aggregationText.last_value',
      { defaultMessage: 'Last value' }
    ),
    fieldRequired: false,
    value: Aggregators.LAST_VALUE,
    validNormalizedTypes: ['number'],
  },
};
