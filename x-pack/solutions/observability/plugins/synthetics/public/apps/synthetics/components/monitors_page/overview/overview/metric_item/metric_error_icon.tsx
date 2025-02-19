/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, useEuiShadow, useEuiTheme } from '@elastic/eui';
import * as React from 'react';
import { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useSyntheticsSettingsContext } from '../../../../../contexts';
import { selectErrorPopoverState, toggleErrorPopoverOpen } from '../../../../../state';

export const MetricErrorIcon = ({ configIdByLocation }: { configIdByLocation: string }) => {
  const isPopoverOpen = useSelector(selectErrorPopoverState);
  const dispatch = useDispatch();

  const setIsPopoverOpen = () => {
    dispatch(toggleErrorPopoverOpen(configIdByLocation));
  };
  const timer = useRef<NodeJS.Timeout | null>(null);
  const euiShadow = useEuiShadow('s');

  const theme = useEuiTheme().euiTheme;
  const { darkMode } = useSyntheticsSettingsContext();

  return (
    <div
      css={css`
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        width: 32px;
        height: 32px;
        background: ${darkMode ? theme.colors.backgroundBaseSubdued : theme.colors.lightestShade};
        border: 1px solid ${darkMode ? theme.colors.darkShade : theme.colors.lightShade};
        box-shadow: ${euiShadow};
        border-radius: 16px;
        flex: none;
        order: 0;
        flex-grow: 0;
      `}
      onMouseEnter={() => {
        // show popover with delay
        if (timer.current) {
          clearTimeout(timer.current);
        }
        timer.current = setTimeout(() => {
          setIsPopoverOpen();
        }, 300);
      }}
      onMouseLeave={() => {
        if (isPopoverOpen) {
          return;
        } else if (timer.current) {
          clearTimeout(timer.current);
        }
      }}
      onClick={() => {
        if (configIdByLocation === isPopoverOpen) {
          dispatch(toggleErrorPopoverOpen(null));
        } else {
          dispatch(toggleErrorPopoverOpen(configIdByLocation));
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          if (configIdByLocation === isPopoverOpen) {
            dispatch(toggleErrorPopoverOpen(null));
          } else {
            dispatch(toggleErrorPopoverOpen(configIdByLocation));
          }
        }
      }}
    >
      <EuiButtonIcon
        data-test-subj="syntheticsMetricItemIconButton"
        iconType="warning"
        color="danger"
        size="m"
        aria-label={ERROR_DETAILS}
      />
    </div>
  );
};
const ERROR_DETAILS = i18n.translate('xpack.synthetics.errorDetails.label', {
  defaultMessage: 'Error details',
});
