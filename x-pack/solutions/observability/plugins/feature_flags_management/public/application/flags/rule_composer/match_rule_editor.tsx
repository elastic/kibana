/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiRadioGroup, EuiSelect, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  LIMITS,
  MATCH_OPERATORS,
  SEMVER_OPERATORS,
  type MatchOperator,
  type MatchRule,
  type Rule,
  type VariationValue,
} from '../../../../common';
import { AttributeComboBox } from './attribute_combo_box';
import { ValuesComboBox } from './values_combo_box';

const operatorLabel = (operator: MatchOperator): string => {
  switch (operator) {
    case 'in':
      return i18n.translate('xpack.featureFlagsManagement.ruleComposer.inOperatorLabel', {
        defaultMessage: 'is one of',
      });
    case 'not_in':
      return i18n.translate('xpack.featureFlagsManagement.ruleComposer.notInOperatorLabel', {
        defaultMessage: 'is not one of',
      });
    case 'semver_lt':
      return i18n.translate('xpack.featureFlagsManagement.ruleComposer.semverLtOperatorLabel', {
        defaultMessage: 'is a semver less than',
      });
    case 'semver_gt':
      return i18n.translate('xpack.featureFlagsManagement.ruleComposer.semverGtOperatorLabel', {
        defaultMessage: 'is a semver greater than',
      });
    case 'semver_lte':
      return i18n.translate('xpack.featureFlagsManagement.ruleComposer.semverLteOperatorLabel', {
        defaultMessage: 'is a semver less than or equal to',
      });
    case 'semver_gte':
      return i18n.translate('xpack.featureFlagsManagement.ruleComposer.semverGteOperatorLabel', {
        defaultMessage: 'is a semver greater than or equal to',
      });
  }
};

const isMatchOperator = (value: string): value is MatchOperator =>
  (MATCH_OPERATORS as readonly string[]).includes(value);

const isSemverOperator = (operator: MatchOperator): boolean => SEMVER_OPERATORS.includes(operator);

const withReturn = (rule: MatchRule, value: VariationValue): MatchRule => ({
  type: 'match',
  attribute: rule.attribute,
  operator: rule.operator,
  values: rule.values,
  return: value,
});

const withNested = (rule: MatchRule, rules: Rule[]): MatchRule => ({
  type: 'match',
  attribute: rule.attribute,
  operator: rule.operator,
  values: rule.values,
  rules,
});

export const MatchRuleEditor = ({
  rule,
  variations,
  apps,
  environment,
  depth,
  ruleIndex,
  readOnly,
  onChange,
  renderNested,
}: {
  rule: MatchRule;
  variations: readonly VariationValue[];
  apps: readonly string[];
  environment: string;
  depth: number;
  ruleIndex: number;
  readOnly: boolean;
  onChange: (rule: MatchRule) => void;
  renderNested: (rules: Rule[], onNestedChange: (rules: Rule[]) => void) => React.ReactNode;
}) => {
  const semver = isSemverOperator(rule.operator);
  const useNested = rule.return === undefined && rule.rules !== undefined;
  const canNest = depth < LIMITS.maxRuleDepth || useNested;
  const served = rule.return !== undefined ? String(rule.return) : String(variations[0] ?? '');

  return (
    <>
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.featureFlagsManagement.ruleComposer.attributeLabel"
            defaultMessage="Attribute"
          />
        }
      >
        <AttributeComboBox
          apps={apps}
          environment={environment}
          selected={rule.attribute}
          readOnly={readOnly}
          ariaLabel={i18n.translate(
            'xpack.featureFlagsManagement.ruleComposer.attributeAriaLabel',
            {
              defaultMessage: 'Context attribute',
            }
          )}
          placeholder={i18n.translate(
            'xpack.featureFlagsManagement.ruleComposer.attributePlaceholder',
            { defaultMessage: 'Select or type an attribute' }
          )}
          onChange={(attribute) => onChange({ ...rule, attribute })}
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.featureFlagsManagement.ruleComposer.operatorLabel"
            defaultMessage="Operator"
          />
        }
        helpText={
          semver ? (
            <FormattedMessage
              id="xpack.featureFlagsManagement.ruleComposer.semverHelp"
              defaultMessage="Enter one full version, for example 9.3.2."
            />
          ) : undefined
        }
      >
        <EuiSelect
          data-ebt-action="changeSelection"
          data-ebt-element="featureFlagsManagement"
          data-test-subj="featureFlagsManagementMatchRuleEditorSelect"
          fullWidth
          disabled={readOnly}
          aria-label={i18n.translate(
            'xpack.featureFlagsManagement.ruleComposer.operatorAriaLabel',
            {
              defaultMessage: 'Operator',
            }
          )}
          value={rule.operator}
          options={MATCH_OPERATORS.map((operator) => ({
            value: operator,
            text: operatorLabel(operator),
          }))}
          onChange={(event) => {
            const next = event.target.value;
            if (!isMatchOperator(next)) {
              return;
            }
            const values = isSemverOperator(next) ? rule.values.slice(0, 1) : rule.values;
            onChange(
              rule.return !== undefined || rule.rules === undefined
                ? { ...withReturn(rule, rule.return ?? variations[0]), operator: next, values }
                : { ...withNested(rule, rule.rules), operator: next, values }
            );
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.featureFlagsManagement.ruleComposer.valuesLabel"
            defaultMessage="Values"
          />
        }
      >
        <ValuesComboBox
          apps={apps}
          environment={environment}
          attribute={rule.attribute}
          values={rule.values}
          singleSelection={semver}
          readOnly={readOnly}
          onChange={(values) => onChange({ ...rule, values })}
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.featureFlagsManagement.ruleComposer.outcomeLabel"
            defaultMessage="When this matches"
          />
        }
        helpText={
          depth >= LIMITS.maxRuleDepth ? (
            <FormattedMessage
              id="xpack.featureFlagsManagement.ruleComposer.maxDepthHelp"
              defaultMessage="Rules can be nested at most {max} levels deep."
              values={{ max: LIMITS.maxRuleDepth }}
            />
          ) : undefined
        }
      >
        <EuiRadioGroup
          data-ebt-action="changeSelection"
          data-ebt-element="featureFlagsManagement"
          data-test-subj="featureFlagsManagementMatchRuleEditorRadioGroup"
          disabled={readOnly}
          name={`feature-flags-rule-outcome-${depth}-${ruleIndex}`}
          options={[
            {
              id: 'return',
              label: i18n.translate(
                'xpack.featureFlagsManagement.ruleComposer.serveVariationLabel',
                {
                  defaultMessage: 'Serve a variation',
                }
              ),
            },
            ...(canNest
              ? [
                  {
                    id: 'nested',
                    label: i18n.translate(
                      'xpack.featureFlagsManagement.ruleComposer.nestedRulesLabel',
                      { defaultMessage: 'Evaluate nested rules' }
                    ),
                  },
                ]
              : []),
          ]}
          idSelected={useNested ? 'nested' : 'return'}
          onChange={(id) => {
            if (id === 'nested') {
              onChange(withNested(rule, rule.rules ?? []));
            } else {
              onChange(withReturn(rule, rule.return ?? variations[0]));
            }
          }}
        />
      </EuiFormRow>
      {useNested ? (
        <>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.featureFlagsManagement.ruleComposer.nestedAndDescription"
                defaultMessage="Nested rules are combined with AND. Every nested rule has to match."
              />
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          {renderNested(rule.rules ?? [], (rules) => onChange(withNested(rule, rules)))}
        </>
      ) : (
        <EuiFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.featureFlagsManagement.ruleComposer.servedVariationLabel"
              defaultMessage="Served variation"
            />
          }
        >
          <EuiSelect
            data-ebt-action="changeSelection"
            data-ebt-element="featureFlagsManagement"
            data-test-subj="featureFlagsManagementMatchRuleEditorSelect"
            fullWidth
            disabled={readOnly}
            aria-label={i18n.translate(
              'xpack.featureFlagsManagement.ruleComposer.servedVariationAriaLabel',
              { defaultMessage: 'Served variation' }
            )}
            value={served}
            options={variations.map((variation) => ({
              value: String(variation),
              text: String(variation),
            }))}
            onChange={(event) => {
              const next = variations.find((variation) => String(variation) === event.target.value);
              if (next !== undefined) {
                onChange(withReturn(rule, next));
              }
            }}
          />
        </EuiFormRow>
      )}
    </>
  );
};
