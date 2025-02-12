/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { EuiComboBoxOptionOption, EuiComboBoxProps } from '@elastic/eui';
import { EuiComboBox, EuiPanel, useEuiTheme } from '@elastic/eui';
import type { LegacyRef } from 'react';
import React, { useCallback, useMemo } from 'react';
import { useStackByFields } from './hooks';
import * as i18n from './translations';

const DEFAULT_WIDTH = 400;
const DEFAULT_EXPANDED_PANEL_HEIGHT = 300;
const DEFAULT_MOBILE_EXPANDED_PANEL_HEIGHT = 300;
const DEFAULT_COLLAPSED_PANEL_HEIGHT = 64; // px

export interface KpiPanelProps {
  /**
   * Height to use when the panel is expanded
   */
  height?: number | undefined;
  /**
   * True if the panel is expanded
   */
  toggleStatus: boolean;
  /**
   * Data test subject string for testing
   */
  ['data-test-subj']: string;
  /**
   * Children component
   */
  children: React.ReactNode;
}

export const KpiPanel = ({
  height,
  toggleStatus,
  'data-test-subj': dataTestSubj,
  children,
}: KpiPanelProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      data-test-subj={dataTestSubj}
      css={css`
        display: flex;
        flex-direction: column;
        position: relative;
        overflow: hidden;
        @media only screen and (min-width: ${euiTheme.breakpoint.m}px) {
          height: ${toggleStatus
            ? height
              ? height
              : DEFAULT_EXPANDED_PANEL_HEIGHT
            : DEFAULT_COLLAPSED_PANEL_HEIGHT}px;
        }
        height: ${toggleStatus
          ? height
            ? height
            : DEFAULT_MOBILE_EXPANDED_PANEL_HEIGHT
          : DEFAULT_COLLAPSED_PANEL_HEIGHT}px;
      `}
    >
      {children}
    </EuiPanel>
  );
};

interface StackedBySelectProps {
  'aria-label'?: string;
  'data-test-subj'?: string;
  dropDownoptions?: Array<EuiComboBoxOptionOption<string>>;
  inputRef?: (inputRef: HTMLInputElement | null) => void;
  isDisabled?: boolean;
  onSelect: (selected: string) => void;
  prepend?: string;
  selected: string;
  useLensCompatibleFields?: boolean;
  width?: number;
}

export const StackByComboBox = React.forwardRef(
  (
    {
      'aria-label': ariaLabel = i18n.STACK_BY_ARIA_LABEL,
      'data-test-subj': dataTestSubj,
      isDisabled = false,
      onSelect,
      prepend = i18n.STACK_BY_LABEL,
      selected,
      inputRef,
      width = DEFAULT_WIDTH,
      dropDownoptions,
      useLensCompatibleFields,
    }: StackedBySelectProps,
    ref
  ) => {
    const onChange = useCallback<NonNullable<EuiComboBoxProps<string>['onChange']>>(
      (options) => {
        if (options && options.length && options[0].value) {
          onSelect(options[0].value);
        } else {
          onSelect('');
        }
      },
      [onSelect]
    );
    const selectedOptions = useMemo(() => {
      return [{ label: selected, value: selected }];
    }, [selected]);

    const getExpensiveFields = useStackByFields(useLensCompatibleFields);

    const options = useMemo(
      () => dropDownoptions ?? getExpensiveFields(),
      [dropDownoptions, getExpensiveFields]
    );

    const singleSelection = useMemo(() => {
      return { asPlainText: true };
    }, []);
    return (
      <div
        css={css`
          max-width: 400px;
          width: ${width}px;
        `}
      >
        <EuiComboBox
          data-test-subj={dataTestSubj}
          aria-label={ariaLabel}
          inputRef={inputRef}
          isDisabled={isDisabled}
          placeholder={i18n.STACK_BY_PLACEHOLDER}
          prepend={prepend}
          ref={ref as LegacyRef<EuiComboBox<string>> | undefined}
          singleSelection={singleSelection}
          isClearable={false}
          sortMatchesBy="startsWith"
          options={options}
          selectedOptions={selectedOptions}
          compressed
          onChange={onChange}
        />
      </div>
    );
  }
);

StackByComboBox.displayName = 'StackByComboBox';
