/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import useObservable from 'react-use/lib/useObservable';
import type { Observable } from 'rxjs';

import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiHealth,
  EuiPopover,
  useEuiTheme,
} from '@elastic/eui';
import type { Space } from '@kbn/spaces-plugin/public';
import { i18n } from '@kbn/i18n';

import { daybreakStatus$, setDaybreakStatus, type DaybreakStatus } from './daybreak_state';

interface StatusOption {
  id: DaybreakStatus;
  label: string;
  /** EUI EuiHealth color token. */
  color: 'subdued' | 'success' | 'danger';
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    id: 'healthy',
    label: i18n.translate('xpack.securitySolution.daybreak.statusControl.healthy', {
      defaultMessage: 'Healthy',
    }),
    color: 'success',
  },
  {
    id: 'critical',
    label: i18n.translate('xpack.securitySolution.daybreak.statusControl.critical', {
      defaultMessage: 'Critical',
    }),
    color: 'danger',
  },
];

const getOption = (status: DaybreakStatus): StatusOption =>
  STATUS_OPTIONS.find((opt) => opt.id === status) ?? STATUS_OPTIONS[0];

interface DaybreakStatusControlProps {
  /**
   * Active space stream — the control hides itself unless the active
   * space's `solution` is `'daybreak'`, so it only appears in the
   * Daybreak solution view.
   */
  activeSpace$: Observable<Space | undefined>;
}

/**
 * Chrome header dropdown that drives the global Daybreak system
 * status. Lives next to the user profile / search controls on the
 * right side of the chrome (registered via
 * `chrome.navControls.registerRight` in the security plugin's `start`
 * lifecycle).
 *
 * Picking an option flips the `daybreakStatus$` subject, which the
 * Daybreak landing page subscribes to and renders different content
 * for. Only visible in the Daybreak solution view.
 */
export const DaybreakStatusControl: React.FC<DaybreakStatusControlProps> = ({
  activeSpace$,
}) => {
  const { euiTheme } = useEuiTheme();
  const activeSpace = useObservable(activeSpace$);
  const status = useObservable(daybreakStatus$, daybreakStatus$.getValue());
  const [isOpen, setIsOpen] = useState(false);

  if (activeSpace?.solution !== 'daybreak') {
    return null;
  }

  const current = getOption(status);

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downRight"
      panelPaddingSize="none"
      button={
        <EuiButtonEmpty
          size="s"
          color="text"
          iconType="arrowDown"
          iconSide="right"
          data-test-subj="daybreakStatusControlButton"
          onClick={() => setIsOpen((v) => !v)}
          css={css`
            margin-right: ${euiTheme.size.s};
            /*
             * Force the label to render in the chrome header text
             * colour so the EuiHealth dot is the only thing carrying
             * the status colour. Otherwise "Critical" would render
             * the whole label in red. Daybreak inherits Nightshift's
             * dark-mode chrome.
             */
            color: rgb(202, 211, 226);
            &,
            .euiButtonEmpty__content,
            .euiButtonEmpty__text,
            .euiHealth__text,
            .euiHealth {
              color: rgb(202, 211, 226);
            }
          `}
          aria-label={i18n.translate(
            'xpack.securitySolution.daybreak.statusControl.buttonAriaLabel',
            {
              defaultMessage: 'Daybreak status: {status}',
              values: { status: current.label },
            }
          )}
        >
          <EuiHealth color={current.color} textSize="s">
            {current.label}
          </EuiHealth>
        </EuiButtonEmpty>
      }
    >
      <EuiContextMenuPanel
        items={STATUS_OPTIONS.map((option) => (
          <EuiContextMenuItem
            key={option.id}
            icon={option.id === status ? 'check' : 'empty'}
            data-test-subj={`daybreakStatusOption-${option.id}`}
            onClick={() => {
              setDaybreakStatus(option.id);
              setIsOpen(false);
            }}
          >
            <EuiHealth color={option.color} textSize="s">
              {option.label}
            </EuiHealth>
          </EuiContextMenuItem>
        ))}
      />
    </EuiPopover>
  );
};
