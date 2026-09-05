/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { css } from '@emotion/react';
import { EuiCheckbox, EuiPanel, useEuiTheme } from '@elastic/eui';
import { APPROVAL_MODAL_TRANSLATIONS } from './translations';

interface AlwaysAllowCheckboxProps {
  option: {
    id: string;
    label: React.ReactNode;
    checked: boolean;
    onChange: (checked: boolean) => void;
  };
  'data-test-subj'?: string;
}

export const AlwaysAllowCheckbox = memo<AlwaysAllowCheckboxProps>(
  ({ option, 'data-test-subj': dataTestSubj }) => {
    const { euiTheme } = useEuiTheme();
    const { id, label, checked, onChange } = option;

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.checked);
      },
      [onChange]
    );

    return (
      <EuiPanel
        color="subdued"
        hasShadow={false}
        hasBorder={false}
        borderRadius="none"
        css={css({
          borderTop: euiTheme.border.thin,
          borderBottom: euiTheme.border.thin,
          paddingBlock: euiTheme.size.m,
        })}
      >
        <EuiCheckbox
          id={id}
          label={label}
          checked={checked}
          onChange={handleChange}
          aria-label={APPROVAL_MODAL_TRANSLATIONS.alwaysAllowAriaLabel}
          data-test-subj={dataTestSubj}
        />
      </EuiPanel>
    );
  }
);

AlwaysAllowCheckbox.displayName = 'AlwaysAllowCheckbox';
