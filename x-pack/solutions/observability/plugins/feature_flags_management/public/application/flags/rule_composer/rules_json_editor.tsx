/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTextArea,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Rule, ValueType, VariationValue } from '../../../../common';
import { parseRulesJson, serializeRules } from './rules_model';

export const RulesJsonEditor = ({
  rules,
  variations,
  valueType,
  readOnly,
  text,
  onTextChange,
  onApply,
  onBlockingChange,
}: {
  rules: readonly Rule[];
  variations: readonly VariationValue[];
  valueType: ValueType;
  readOnly: boolean;
  text: string;
  onTextChange: (text: string) => void;
  onApply: (rules: Rule[]) => void;
  onBlockingChange?: (blocking: boolean) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const textareaCss = css`
    font-family: ${euiTheme.font.familyCode ?? 'monospace'};
  `;
  const parsed = useMemo(
    () => parseRulesJson(text, { variations, valueType }),
    [text, variations, valueType]
  );
  const dirty = text !== serializeRules(rules);
  const blocking = !readOnly && (!parsed.ok || dirty);
  const onBlockingChangeRef = useRef(onBlockingChange);
  onBlockingChangeRef.current = onBlockingChange;

  useEffect(() => {
    onBlockingChangeRef.current?.(blocking);
  }, [blocking]);

  useEffect(() => () => onBlockingChangeRef.current?.(false), []);

  return (
    <>
      <EuiTextArea
        data-test-subj="featureFlagsManagementRulesJsonEditorTextArea"
        fullWidth
        readOnly={readOnly}
        rows={16}
        css={textareaCss}
        aria-label={i18n.translate('xpack.featureFlagsManagement.ruleComposer.jsonAriaLabel', {
          defaultMessage: 'Rules as JSON',
        })}
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        isInvalid={!parsed.ok}
      />
      {!parsed.ok && (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            announceOnMount
            color="danger"
            iconType="error"
            title={
              <FormattedMessage
                id="xpack.featureFlagsManagement.ruleComposer.jsonInvalidTitle"
                defaultMessage="This JSON is not applied"
              />
            }
          >
            <FormattedMessage
              id="xpack.featureFlagsManagement.ruleComposer.jsonInvalidDescription"
              defaultMessage="The structured rules stay as they were until this JSON is valid and you apply it. Switching back discards invalid JSON."
            />
            <EuiSpacer size="s" />
            <pre>{parsed.error}</pre>
          </EuiCallOut>
        </>
      )}
      {!readOnly && (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="featureFlagsManagementRulesJsonEditorApplyJsonButton"
                size="s"
                fill
                disabled={!parsed.ok || !dirty}
                onClick={() => {
                  if (parsed.ok) {
                    onApply(parsed.rules);
                  }
                }}
              >
                <FormattedMessage
                  id="xpack.featureFlagsManagement.ruleComposer.applyJsonButtonLabel"
                  defaultMessage="Apply JSON"
                />
              </EuiButton>
            </EuiFlexItem>
            {dirty && parsed.ok && (
              <EuiFlexItem>
                <FormattedMessage
                  id="xpack.featureFlagsManagement.ruleComposer.unappliedJsonDescription"
                  defaultMessage="Apply these changes before saving. Switching off JSON editing applies valid JSON."
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};
