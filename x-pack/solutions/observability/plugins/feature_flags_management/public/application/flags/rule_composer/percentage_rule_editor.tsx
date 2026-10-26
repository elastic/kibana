/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiFormRow,
  EuiRange,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PercentageRule, VariationValue } from '../../../../common';
import { AttributeComboBox } from './attribute_combo_box';
import { equalPercentages, percentageWeightsAreValid, percentageWeightsTotal } from './rules_model';

export const PercentageRuleEditor = ({
  rule,
  variations,
  app,
  environment,
  readOnly,
  onChange,
}: {
  rule: PercentageRule;
  variations: readonly VariationValue[];
  app?: string;
  environment: string;
  readOnly: boolean;
  onChange: (rule: PercentageRule) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const total = percentageWeightsTotal(rule.percentages);
  const valid = percentageWeightsAreValid(rule.percentages);
  const totalCss = css`
    color: ${valid ? euiTheme.colors.textSuccess : euiTheme.colors.textDanger};
  `;

  const setWeight = (variation: VariationValue, weight: number) => {
    onChange({
      ...rule,
      percentages: { ...rule.percentages, [String(variation)]: weight },
    });
  };

  return (
    <>
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.featureFlagsManagement.ruleComposer.perAttributeLabel"
            defaultMessage="Bucket by attribute"
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.featureFlagsManagement.ruleComposer.perAttributeHelp"
            defaultMessage="Contexts with the same value of this attribute stay in the same bucket."
          />
        }
      >
        <AttributeComboBox
          app={app}
          environment={environment}
          selected={rule.per_attribute}
          readOnly={readOnly}
          ariaLabel={i18n.translate(
            'xpack.featureFlagsManagement.ruleComposer.perAttributeAriaLabel',
            { defaultMessage: 'Attribute to bucket by' }
          )}
          placeholder={i18n.translate(
            'xpack.featureFlagsManagement.ruleComposer.perAttributePlaceholder',
            { defaultMessage: 'Select or type an attribute' }
          )}
          onChange={(perAttribute) => onChange({ ...rule, per_attribute: perAttribute })}
        />
      </EuiFormRow>
      {variations.map((variation) => {
        const label = String(variation);
        const weight = rule.percentages[label] ?? 0;
        return (
          <EuiFormRow
            key={label}
            fullWidth
            label={
              <FormattedMessage
                id="xpack.featureFlagsManagement.ruleComposer.variationWeightLabel"
                defaultMessage="{variation} weight"
                values={{ variation: label }}
              />
            }
          >
            <EuiRange
              min={0}
              max={100}
              step={1}
              value={weight}
              disabled={readOnly}
              showInput
              fullWidth
              aria-label={i18n.translate(
                'xpack.featureFlagsManagement.ruleComposer.variationWeightAriaLabel',
                {
                  defaultMessage: 'Percentage for {variation}',
                  values: { variation: label },
                }
              )}
              onChange={(event) => {
                const next = Number(event.currentTarget.value);
                if (Number.isInteger(next)) {
                  setWeight(variation, next);
                }
              }}
            />
          </EuiFormRow>
        );
      })}
      <EuiText size="s">
        <p css={totalCss}>
          <FormattedMessage
            id="xpack.featureFlagsManagement.ruleComposer.percentageTotalDescription"
            defaultMessage="Total: {total}. Weights must sum to 100."
            values={{ total }}
          />
        </p>
      </EuiText>
      {!readOnly && (
        <>
          <EuiSpacer size="s" />
          <EuiButtonEmpty
            data-test-subj="featureFlagsManagementPercentageRuleEditorDistributeEvenlyButton"
            size="s"
            onClick={() => onChange({ ...rule, percentages: equalPercentages(variations) })}
          >
            <FormattedMessage
              id="xpack.featureFlagsManagement.ruleComposer.distributeEvenlyButtonLabel"
              defaultMessage="Distribute evenly"
            />
          </EuiButtonEmpty>
        </>
      )}
    </>
  );
};
