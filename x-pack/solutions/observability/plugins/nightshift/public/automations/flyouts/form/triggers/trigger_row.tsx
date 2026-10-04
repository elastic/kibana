/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { TriggerFormValues } from '../automation_form_values';
import { triggerLabels } from './translations';
import { TriggerPicker } from './trigger_picker';

export const TriggerRow = ({
  trigger,
  onSelect,
  onRemove,
  children,
  readOnly = false,
}: {
  trigger: TriggerFormValues;
  onSelect: (kind: TriggerFormValues['kind']) => void;
  onRemove: () => void;
  children: React.ReactNode;
  readOnly?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const rowCss = css`
    padding: ${euiTheme.size.s};
    border-radius: ${euiTheme.border.radius.medium};
    &:hover,
    &:focus-within {
      background-color: ${euiTheme.colors.backgroundBaseInteractiveHover};
    }
    [data-remove-trigger] {
      display: none;
    }
    &:hover [data-remove-trigger],
    &:focus-within [data-remove-trigger] {
      display: block;
    }
  `;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} css={rowCss}>
      <EuiFlexItem>{children}</EuiFlexItem>
      {!readOnly && (
        <EuiFlexItem grow={false}>
          <TriggerPicker
            current={trigger.kind}
            onSelect={onSelect}
            button={(toggle) => (
              <EuiToolTip content={triggerLabels.changeTrigger} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="chevronSingleDown"
                  color="text"
                  aria-label={triggerLabels.changeTrigger}
                  onClick={toggle}
                  data-test-subj="automationChangeTrigger"
                />
              </EuiToolTip>
            )}
          />
        </EuiFlexItem>
      )}
      {!readOnly && (
        <EuiFlexItem grow={false} data-remove-trigger>
          <EuiToolTip content={triggerLabels.removeTrigger} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="trash"
              color="danger"
              aria-label={triggerLabels.removeTrigger}
              onClick={onRemove}
              data-test-subj="automationRemoveTrigger"
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
