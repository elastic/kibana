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

import {
  nightshiftStatus$,
  setNightshiftStatus,
  type NightshiftStatus,
} from './nightshift_state';

interface StatusOption {
  id: NightshiftStatus;
  label: string;
  /** EUI EuiHealth color token. */
  color: 'subdued' | 'success' | 'danger';
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    id: 'loading',
    label: i18n.translate('xpack.observability.nightshift.statusControl.loading', {
      defaultMessage: 'Loading',
    }),
    color: 'subdued',
  },
  {
    id: 'healthy',
    label: i18n.translate('xpack.observability.nightshift.statusControl.healthy', {
      defaultMessage: 'Healthy',
    }),
    color: 'success',
  },
  {
    id: 'critical',
    label: i18n.translate('xpack.observability.nightshift.statusControl.critical', {
      defaultMessage: 'Critical',
    }),
    color: 'danger',
  },
];

const getOption = (status: NightshiftStatus): StatusOption =>
  STATUS_OPTIONS.find((opt) => opt.id === status) ?? STATUS_OPTIONS[0];

interface NightshiftStatusControlProps {
  /**
   * Active space stream — the control hides itself unless the active
   * space's `solution` is `'nightshift'`, so it only appears in the
   * Nightshift solution view.
   */
  activeSpace$: Observable<Space | undefined>;
}

/**
 * Chrome header dropdown that drives the global Nightshift system
 * status. Lives next to the user profile / search controls on the right
 * side of the chrome (registered via `chrome.navControls.registerRight`
 * in the obs plugin's `start` lifecycle).
 *
 * Picking an option flips the `nightshiftStatus$` subject, which the
 * Nightshift analyzing page subscribes to and renders different copy /
 * icons / colors for. Only visible in the Nightshift solution view.
 */
export const NightshiftStatusControl: React.FC<NightshiftStatusControlProps> = ({
  activeSpace$,
}) => {
  const { euiTheme } = useEuiTheme();
  const activeSpace = useObservable(activeSpace$);
  const status = useObservable(nightshiftStatus$, nightshiftStatus$.getValue());
  const [isOpen, setIsOpen] = useState(false);

  if (activeSpace?.solution !== 'nightshift') {
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
          data-test-subj="nightshiftStatusControlButton"
          onClick={() => setIsOpen((v) => !v)}
          css={css`
            margin-right: ${euiTheme.size.s};
            /*
             * Force the label to render in the exact chrome header
             * text color rgb(202, 211, 226) (= #CAD3E2), the same
             * shade the user-profile / search labels use in dark mode.
             * Without this, EuiHealth's text would inherit the
             * health/dot color, which would make "Healthy" look green
             * and "Critical" look red — we want only the dot to carry
             * the status color, not the surrounding label.
             *
             * Nightshift always runs in dark mode, so a static value is
             * safe; if Nightshift ever supports light mode this should
             * switch to a theme token.
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
            'xpack.observability.nightshift.statusControl.buttonAriaLabel',
            {
              defaultMessage: 'Nightshift status: {status}',
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
        size="s"
        items={STATUS_OPTIONS.map((option) => (
          <EuiContextMenuItem
            key={option.id}
            icon={option.id === status ? 'check' : 'empty'}
            data-test-subj={`nightshiftStatusOption-${option.id}`}
            onClick={() => {
              setNightshiftStatus(option.id);
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
