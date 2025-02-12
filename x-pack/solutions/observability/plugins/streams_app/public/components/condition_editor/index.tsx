/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSelect,
  EuiSwitch,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import {
  AndCondition,
  BinaryFilterCondition,
  Condition,
  FilterCondition,
  OrCondition,
} from '@kbn/streams-schema';
import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import { CodeEditor } from '@kbn/code-editor';
import {
  EMPTY_EQUALS_CONDITION,
  alwaysToEmptyEquals,
  emptyEqualsToAlways,
} from '../../util/condition';

export function ConditionEditor(props: {
  condition: Condition;
  readonly?: boolean;
  onConditionChange?: (condition: Condition) => void;
}) {
  const normalizedCondition = alwaysToEmptyEquals(props.condition);

  const handleConditionChange = (condition: Condition) => {
    props.onConditionChange?.(emptyEqualsToAlways(condition));
  };

  if (props.readonly) {
    return (
      <EuiPanel color="subdued" borderRadius="none" hasShadow={false} paddingSize="xs">
        <ConditionDisplay condition={normalizedCondition} />
      </EuiPanel>
    );
  }
  return (
    <ConditionForm condition={normalizedCondition} onConditionChange={handleConditionChange} />
  );
}

export function ConditionForm(props: {
  condition: Condition;
  onConditionChange: (condition: Condition) => void;
}) {
  const [syntaxEditor, setSyntaxEditor] = React.useState(() =>
    Boolean(props.condition && !('operator' in props.condition))
  );
  const [jsonCondition, setJsonCondition] = React.useState<string | null>(() =>
    JSON.stringify(props.condition, null, 2)
  );
  useEffect(() => {
    if (!syntaxEditor && props.condition) {
      setJsonCondition(JSON.stringify(props.condition, null, 2));
    }
  }, [syntaxEditor, props.condition]);
  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexGroup alignItems="center" gutterSize="xs">
        <EuiFlexItem grow>
          <EuiText
            className={css`
              font-weight: bold;
            `}
            size="xs"
          >
            {i18n.translate('xpack.streams.conditionEditor.title', { defaultMessage: 'Condition' })}
          </EuiText>
        </EuiFlexItem>
        <EuiToolTip
          content={i18n.translate('xpack.streams.conditionEditor.disableTooltip', {
            defaultMessage: 'Route no documents to this stream without deleting existing data',
          })}
        >
          <EuiButton
            data-test-subj="streamsAppConditionFormDisableRoutingButton"
            size={'xs' as 's'} // TODO: remove this cast when EUI is updated - EuiButton takes xs, but the type is wrong
            onClick={() => props.onConditionChange({ never: {} })}
            disabled={props.condition === undefined}
          >
            {i18n.translate('xpack.streams.conditionEditor.disable', {
              defaultMessage: 'Disable routing',
            })}
          </EuiButton>
        </EuiToolTip>

        <EuiSwitch
          label={i18n.translate('xpack.streams.conditionEditor.switch', {
            defaultMessage: 'Syntax editor',
          })}
          compressed
          checked={syntaxEditor}
          onChange={() => setSyntaxEditor(!syntaxEditor)}
        />
      </EuiFlexGroup>
      {syntaxEditor ? (
        <CodeEditor
          height={200}
          languageId="json"
          value={jsonCondition || ''}
          onChange={(e) => {
            setJsonCondition(e);
            try {
              const condition = JSON.parse(e);
              props.onConditionChange(condition);
            } catch (error: unknown) {
              // do nothing
            }
          }}
        />
      ) : !props.condition || 'operator' in props.condition ? (
        <FilterForm
          condition={(props.condition as FilterCondition) || EMPTY_EQUALS_CONDITION}
          onConditionChange={props.onConditionChange}
        />
      ) : (
        <pre>{JSON.stringify(props.condition, null, 2)}</pre>
      )}
    </EuiFlexGroup>
  );
}

const operatorMap = {
  eq: i18n.translate('xpack.streams.filter.equals', { defaultMessage: 'equals' }),
  neq: i18n.translate('xpack.streams.filter.notEquals', { defaultMessage: 'not equals' }),
  lt: i18n.translate('xpack.streams.filter.lessThan', { defaultMessage: 'less than' }),
  lte: i18n.translate('xpack.streams.filter.lessThanOrEquals', {
    defaultMessage: 'less than or equals',
  }),
  gt: i18n.translate('xpack.streams.filter.greaterThan', { defaultMessage: 'greater than' }),
  gte: i18n.translate('xpack.streams.filter.greaterThanOrEquals', {
    defaultMessage: 'greater than or equals',
  }),
  contains: i18n.translate('xpack.streams.filter.contains', { defaultMessage: 'contains' }),
  startsWith: i18n.translate('xpack.streams.filter.startsWith', { defaultMessage: 'starts with' }),
  endsWith: i18n.translate('xpack.streams.filter.endsWith', { defaultMessage: 'ends with' }),
  exists: i18n.translate('xpack.streams.filter.exists', { defaultMessage: 'exists' }),
  notExists: i18n.translate('xpack.streams.filter.notExists', { defaultMessage: 'not exists' }),
};

function FilterForm(props: {
  condition: FilterCondition;
  onConditionChange: (condition: FilterCondition) => void;
}) {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow>
        <EuiFieldText
          data-test-subj="streamsAppFilterFormFieldText"
          aria-label={i18n.translate('xpack.streams.filter.field', { defaultMessage: 'Field' })}
          compressed
          placeholder={i18n.translate('xpack.streams.filter.fieldPlaceholder', {
            defaultMessage: 'Field',
          })}
          value={props.condition.field}
          onChange={(e) => {
            props.onConditionChange({ ...props.condition, field: e.target.value });
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem grow>
        <EuiSelect
          aria-label={i18n.translate('xpack.streams.filter.operator', {
            defaultMessage: 'Operator',
          })}
          data-test-subj="streamsAppFilterFormSelect"
          options={
            Object.entries(operatorMap).map(([value, text]) => ({
              value,
              text,
            })) as Array<{ value: FilterCondition['operator']; text: string }>
          }
          value={props.condition.operator}
          compressed
          onChange={(e) => {
            const newCondition: Partial<FilterCondition> = {
              ...props.condition,
            };

            const newOperator = e.target.value as FilterCondition['operator'];
            if (newOperator === 'exists' || newOperator === 'notExists') {
              if ('value' in newCondition) delete newCondition.value;
            } else if (!('value' in newCondition)) {
              (newCondition as BinaryFilterCondition).value = '';
            }
            props.onConditionChange({
              ...newCondition,
              operator: newOperator,
            } as FilterCondition);
          }}
        />
      </EuiFlexItem>

      {'value' in props.condition && (
        <EuiFlexItem grow>
          <EuiFieldText
            aria-label={i18n.translate('xpack.streams.filter.value', { defaultMessage: 'Value' })}
            placeholder={i18n.translate('xpack.streams.filter.valuePlaceholder', {
              defaultMessage: 'Value',
            })}
            compressed
            value={String(props.condition.value)}
            data-test-subj="streamsAppFilterFormValueText"
            onChange={(e) => {
              props.onConditionChange({
                ...props.condition,
                value: e.target.value,
              } as BinaryFilterCondition);
            }}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}

export function ConditionDisplay(props: { condition: Condition }) {
  if (!props.condition) {
    return (
      <>
        {i18n.translate('xpack.streams.streamDetailRouting.noCondition', {
          defaultMessage: 'No condition, no documents will be routed',
        })}
      </>
    );
  }
  return (
    <>
      {'or' in props.condition ? (
        <OrDisplay condition={props.condition as OrCondition} />
      ) : 'and' in props.condition ? (
        <AndDisplay condition={props.condition as AndCondition} />
      ) : (
        <FilterDisplay condition={props.condition as FilterCondition} />
      )}
    </>
  );
}

function OrDisplay(props: { condition: OrCondition }) {
  return (
    <div>
      {i18n.translate('xpack.streams.orDisplay.orLabel', { defaultMessage: 'Or' })}
      <div
        className={css`
          margin-left: 10px;
        `}
      >
        {props.condition.or.map((condition, index) => (
          <ConditionEditor key={index} condition={condition} readonly />
        ))}
      </div>
    </div>
  );
}

function AndDisplay(props: { condition: AndCondition }) {
  return (
    <div>
      {i18n.translate('xpack.streams.andDisplay.andLabel', { defaultMessage: 'And' })}
      <div
        className={css`
          margin-left: 10px;
        `}
      >
        {props.condition.and.map((condition, index) => (
          <ConditionEditor key={index} condition={condition} readonly />
        ))}
      </div>
    </div>
  );
}

function FilterDisplay(props: { condition: FilterCondition }) {
  return (
    <EuiFlexGroup
      gutterSize="xs"
      alignItems="center"
      className={css`
        // don't try to wrap the condition, render it as one line
        overflow-x: scroll;
        white-space: nowrap;
      `}
    >
      <EuiBadge>
        {i18n.translate('xpack.streams.filter.field', { defaultMessage: 'Field' })}
      </EuiBadge>
      {props.condition.field}
      <EuiBadge>
        {i18n.translate('xpack.streams.filter.operator', { defaultMessage: 'Operator' })}
      </EuiBadge>
      {props.condition.operator}
      {'value' in props.condition && (
        <>
          <EuiBadge>
            {i18n.translate('xpack.streams.filter.value', { defaultMessage: 'Value' })}
          </EuiBadge>
          {props.condition.value}
        </>
      )}
    </EuiFlexGroup>
  );
}
