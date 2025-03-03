/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { EuiBadgeProps, EuiFormRowProps, EuiSuperSelectOption } from '@elastic/eui';
import { EuiBadge, EuiButtonEmpty, EuiFormRow, EuiIcon, useEuiTheme } from '@elastic/eui';
import styled from 'styled-components';
import { css } from '@emotion/react';
import type { sourcererModel } from '../store';
import * as i18n from './translations';

export const FormRow = styled(EuiFormRow)<EuiFormRowProps & { $expandAdvancedOptions: boolean }>`
  display: ${({ $expandAdvancedOptions }) => ($expandAdvancedOptions ? 'flex' : 'none')};
  max-width: none;
`;

export const StyledFormRow = styled(EuiFormRow)`
  max-width: none;
`;

export const StyledButtonEmpty = styled(EuiButtonEmpty)`
  &:enabled:focus,
  &:focus {
    background-color: transparent;
  }
`;

export const ResetButton = styled(EuiButtonEmpty)`
  width: fit-content;

  &:enabled:focus,
  &:focus {
    background-color: transparent;
  }
`;

export const PopoverContent = styled.div`
  width: 600px;
`;

interface StyledBadgeProps {
  color?: EuiBadgeProps['color'];
  children: React.ReactNode;
  'data-test-subj'?: string;
}

export const StyledBadge = memo(
  ({ color, children, 'data-test-subj': dataTestSubj }: StyledBadgeProps) => {
    const { euiTheme } = useEuiTheme();

    return (
      <EuiBadge
        color={color}
        data-test-subj={dataTestSubj}
        css={css`
          margin-left: ${euiTheme.size.xs};

          &,
          .euiBadge__text {
            cursor: pointer;
          }
        `}
      >
        {children}
      </EuiBadge>
    );
  }
);
StyledBadge.displayName = 'StyledBadge';

export const Blockquote = memo(({ children }: { children: React.ReactNode }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <span
      css={css`
        display: block;
        border-color: ${euiTheme.colors.darkShade};
        border-left: ${euiTheme.border.thick};
        margin: ${euiTheme.size.s} 0 ${euiTheme.size.s} ${euiTheme.size.s};
        padding: ${euiTheme.size.s};
      `}
    >
      {children}
    </span>
  );
});
Blockquote.displayName = 'Blockquote';

interface GetDataViewSelectOptionsProps {
  dataViewId: string;
  defaultDataViewId: sourcererModel.KibanaDataView['id'];
  isModified: boolean;
  isOnlyDetectionAlerts: boolean;
  kibanaDataViews: sourcererModel.KibanaDataView[];
}

export const getDataViewSelectOptions = ({
  dataViewId,
  defaultDataViewId,
  isModified,
  isOnlyDetectionAlerts,
  kibanaDataViews,
}: GetDataViewSelectOptionsProps): Array<EuiSuperSelectOption<string>> =>
  isOnlyDetectionAlerts
    ? [
        {
          inputDisplay: (
            <span data-test-subj="security-alerts-option-super">
              <EuiIcon type="logoSecurity" size="s" /> {i18n.SIEM_SECURITY_DATA_VIEW_LABEL}
              <StyledBadge data-test-subj="security-alerts-option-badge">
                {i18n.ALERTS_BADGE_TITLE}
              </StyledBadge>
            </span>
          ),
          value: defaultDataViewId,
        },
      ]
    : kibanaDataViews.map(({ title, id }) => ({
        inputDisplay:
          id === defaultDataViewId ? (
            <span data-test-subj="security-option-super">
              <EuiIcon type="logoSecurity" size="s" /> {i18n.SECURITY_DEFAULT_DATA_VIEW_LABEL}
              {isModified && id === dataViewId && (
                <StyledBadge data-test-subj="security-modified-option-badge">
                  {i18n.MODIFIED_BADGE_TITLE}
                </StyledBadge>
              )}
            </span>
          ) : (
            <span data-test-subj="dataView-option-super">
              <EuiIcon type="logoKibana" size="s" /> {title}
              {isModified && id === dataViewId && (
                <StyledBadge data-test-subj="security-modified-option-badge">
                  {i18n.MODIFIED_BADGE_TITLE}
                </StyledBadge>
              )}
            </span>
          ),
        value: id,
      }));

interface GetTooltipContent {
  isOnlyDetectionAlerts: boolean;
  isPopoverOpen: boolean;
  selectedPatterns: string[];
  signalIndexName: string | null;
}

export const getTooltipContent = ({
  isOnlyDetectionAlerts,
  isPopoverOpen,
  selectedPatterns,
  signalIndexName,
}: GetTooltipContent): string | null => {
  if (isPopoverOpen || (isOnlyDetectionAlerts && !signalIndexName)) {
    return null;
  }
  return (isOnlyDetectionAlerts ? [signalIndexName] : selectedPatterns).join(', ');
};

export const getPatternListWithoutSignals = (
  patternList: string[],
  signalIndexName: string | null
): string[] => patternList.filter((p) => p !== signalIndexName);
