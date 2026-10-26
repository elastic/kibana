/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { LIMITS, type Rule, type ValueType, type VariationValue } from '../../../../common';
import { MatchRuleEditor } from './match_rule_editor';
import { PercentageRuleEditor } from './percentage_rule_editor';
import { RulesJsonEditor } from './rules_json_editor';
import { emptyMatchRule, emptyPercentageRule, parseRulesJson, serializeRules } from './rules_model';

const moveRule = (rules: readonly Rule[], index: number, direction: -1 | 1): Rule[] => {
  const target = index + direction;
  if (target < 0 || target >= rules.length) {
    return [...rules];
  }
  const next = [...rules];
  const [rule] = next.splice(index, 1);
  next.splice(target, 0, rule);
  return next;
};

export const RuleComposer = ({
  rules,
  variations,
  valueType,
  app,
  environment,
  depth = 1,
  readOnly,
  onChange,
  onJsonBlockingChange,
}: {
  rules: readonly Rule[];
  variations: readonly VariationValue[];
  valueType: ValueType;
  app?: string;
  environment: string;
  depth?: number;
  readOnly: boolean;
  onChange: (rules: Rule[]) => void;
  onJsonBlockingChange?: (blocking: boolean) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const nestedCss = css`
    margin-top: ${euiTheme.size.s};
    margin-left: ${euiTheme.size.l};
    padding-left: ${euiTheme.size.m};
    border-left: ${euiTheme.border.thin};
  `;
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const atRuleLimit = rules.length >= LIMITS.maxRulesPerLevel;

  const updateRule = (index: number, rule: Rule) => {
    const next = [...rules];
    next[index] = rule;
    onChange(next);
  };

  const enterJsonMode = () => {
    setJsonText(serializeRules(rules));
    setJsonMode(true);
  };

  const leaveJsonMode = () => {
    const parsed = parseRulesJson(jsonText, { variations, valueType });
    if (parsed.ok && jsonText !== serializeRules(rules)) {
      onChange(parsed.rules);
    }
    setJsonMode(false);
    onJsonBlockingChange?.(false);
  };

  return (
    <div data-test-subj={depth === 1 ? 'featureFlagsRuleComposer' : undefined}>
      {depth === 1 && (
        <>
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.featureFlagsManagement.ruleComposer.firstMatchDescription"
                defaultMessage="Rules are evaluated in order. The first match wins."
              />
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.featureFlagsManagement.ruleComposer.editAsJsonToggle"
                defaultMessage="Edit as JSON"
              />
            }
            checked={jsonMode}
            onChange={() => {
              if (jsonMode) {
                leaveJsonMode();
              } else {
                enterJsonMode();
              }
            }}
          />
          <EuiSpacer size="m" />
        </>
      )}
      {depth === 1 && jsonMode ? (
        <RulesJsonEditor
          rules={rules}
          variations={variations}
          valueType={valueType}
          readOnly={readOnly}
          text={jsonText}
          onTextChange={setJsonText}
          onBlockingChange={onJsonBlockingChange}
          onApply={(next) => {
            onChange(next);
            setJsonText(serializeRules(next));
          }}
        />
      ) : (
        <>
          {rules.map((rule, index) => {
            const moveUpLabel = i18n.translate(
              'xpack.featureFlagsManagement.ruleComposer.moveRuleUpAriaLabel',
              {
                defaultMessage: 'Move rule {number} up',
                values: { number: index + 1 },
              }
            );
            const moveDownLabel = i18n.translate(
              'xpack.featureFlagsManagement.ruleComposer.moveRuleDownAriaLabel',
              {
                defaultMessage: 'Move rule {number} down',
                values: { number: index + 1 },
              }
            );
            const deleteLabel = i18n.translate(
              'xpack.featureFlagsManagement.ruleComposer.deleteRuleAriaLabel',
              {
                defaultMessage: 'Delete rule {number}',
                values: { number: index + 1 },
              }
            );

            return (
              <React.Fragment key={`${depth}-${index}`}>
                {index > 0 && <EuiSpacer size="m" />}
                <EuiPanel hasBorder paddingSize="m">
                  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                    <EuiFlexItem>
                      <EuiTitle size="xxs">
                        <h4>
                          {rule.type === 'percentage' ? (
                            <FormattedMessage
                              id="xpack.featureFlagsManagement.ruleComposer.percentageRuleTitle"
                              defaultMessage="Percentage rule {number}"
                              values={{ number: index + 1 }}
                            />
                          ) : (
                            <FormattedMessage
                              id="xpack.featureFlagsManagement.ruleComposer.matchRuleTitle"
                              defaultMessage="Match rule {number}"
                              values={{ number: index + 1 }}
                            />
                          )}
                        </h4>
                      </EuiTitle>
                    </EuiFlexItem>
                    {!readOnly && (
                      <>
                        <EuiFlexItem grow={false}>
                          <EuiToolTip content={moveUpLabel} disableScreenReaderOutput>
                            <EuiButtonIcon
                              data-ebt-action="moveRule"
                              data-ebt-element="featureFlagsManagement"
                              data-test-subj="featureFlagsManagementRuleComposerButton"
                              iconType="chevronSingleUp"
                              display="empty"
                              disabled={index === 0}
                              aria-label={moveUpLabel}
                              onClick={() => onChange(moveRule(rules, index, -1))}
                            />
                          </EuiToolTip>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiToolTip content={moveDownLabel} disableScreenReaderOutput>
                            <EuiButtonIcon
                              data-ebt-action="moveRule"
                              data-ebt-element="featureFlagsManagement"
                              data-test-subj="featureFlagsManagementRuleComposerButton"
                              iconType="chevronSingleDown"
                              display="empty"
                              disabled={index === rules.length - 1}
                              aria-label={moveDownLabel}
                              onClick={() => onChange(moveRule(rules, index, 1))}
                            />
                          </EuiToolTip>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiToolTip content={deleteLabel} disableScreenReaderOutput>
                            <EuiButtonIcon
                              data-ebt-action="removeRule"
                              data-ebt-element="featureFlagsManagement"
                              data-test-subj="featureFlagsManagementRuleComposerButton"
                              iconType="trash"
                              color="danger"
                              display="empty"
                              aria-label={deleteLabel}
                              onClick={() =>
                                onChange(rules.filter((_, ruleIndex) => ruleIndex !== index))
                              }
                            />
                          </EuiToolTip>
                        </EuiFlexItem>
                      </>
                    )}
                  </EuiFlexGroup>
                  <EuiSpacer size="s" />
                  {rule.type === 'percentage' ? (
                    <PercentageRuleEditor
                      rule={rule}
                      variations={variations}
                      app={app}
                      environment={environment}
                      readOnly={readOnly}
                      onChange={(next) => updateRule(index, next)}
                    />
                  ) : (
                    <MatchRuleEditor
                      rule={rule}
                      variations={variations}
                      app={app}
                      environment={environment}
                      depth={depth}
                      ruleIndex={index}
                      readOnly={readOnly}
                      onChange={(next) => updateRule(index, next)}
                      renderNested={(nested, onNestedChange) => (
                        <div css={nestedCss}>
                          <RuleComposer
                            rules={nested}
                            variations={variations}
                            valueType={valueType}
                            app={app}
                            environment={environment}
                            depth={depth + 1}
                            readOnly={readOnly}
                            onChange={onNestedChange}
                          />
                        </div>
                      )}
                    />
                  )}
                </EuiPanel>
              </React.Fragment>
            );
          })}
          {rules.length === 0 && (
            <EuiText size="s" color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.featureFlagsManagement.ruleComposer.emptyRulesDescription"
                  defaultMessage="No rules yet. The default variation is served."
                />
              </p>
            </EuiText>
          )}
          {!readOnly && (
            <>
              <EuiSpacer size="m" />
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-ebt-action="addRule"
                    data-ebt-element="featureFlagsManagement"
                    data-test-subj="featureFlagsManagementRuleComposerAddMatchRuleButton"
                    size="s"
                    iconType="plus"
                    disabled={atRuleLimit || variations.length === 0}
                    onClick={() => onChange([...rules, emptyMatchRule(variations)])}
                  >
                    <FormattedMessage
                      id="xpack.featureFlagsManagement.ruleComposer.addMatchRuleButtonLabel"
                      defaultMessage="Add match rule"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-ebt-action="addRule"
                    data-ebt-element="featureFlagsManagement"
                    data-test-subj="featureFlagsManagementRuleComposerAddPercentageRuleButton"
                    size="s"
                    iconType="plus"
                    disabled={atRuleLimit || variations.length === 0}
                    onClick={() => onChange([...rules, emptyPercentageRule(variations)])}
                  >
                    <FormattedMessage
                      id="xpack.featureFlagsManagement.ruleComposer.addPercentageRuleButtonLabel"
                      defaultMessage="Add percentage rule"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          )}
        </>
      )}
    </div>
  );
};
