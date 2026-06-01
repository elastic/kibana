/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
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

/**
 * Solution ids the Nightshift status dropdown supports. Each solution
 * exposes its own subset of statuses (see `STATUS_OPTIONS_BY_SOLUTION`).
 *
 *  - `'nightshift'` — full obs Nightshift flow (loading / healthy / morning / critical)
 *  - `'es'`         — Search-solution Nightshift surface (single `search` option)
 */
type SupportedSolution = 'nightshift' | 'es';

interface StatusOption {
  id: NightshiftStatus;
  label: string;
  /** EUI EuiHealth color token. */
  color: 'subdued' | 'success' | 'danger';
}

const OBSERVABILITY_OPTIONS: StatusOption[] = [
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
    id: 'morning',
    label: i18n.translate('xpack.observability.nightshift.statusControl.morning', {
      defaultMessage: 'Morning',
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

const SEARCH_OPTIONS: StatusOption[] = [
  {
    id: 'vectordb',
    label: i18n.translate('xpack.observability.nightshift.statusControl.vectordb', {
      defaultMessage: 'VectorDB',
    }),
    color: 'success',
  },
  {
    id: 'search',
    label: i18n.translate('xpack.observability.nightshift.statusControl.search', {
      defaultMessage: 'Search',
    }),
    color: 'success',
  },
];

/**
 * Map a supported solution to the set of status options the dropdown
 * exposes inside that solution. The dropdown stays hidden in every
 * other solution.
 */
const STATUS_OPTIONS_BY_SOLUTION: Record<SupportedSolution, StatusOption[]> = {
  nightshift: OBSERVABILITY_OPTIONS,
  es: SEARCH_OPTIONS,
};

const getOption = (
  status: NightshiftStatus,
  options: StatusOption[]
): StatusOption => options.find((opt) => opt.id === status) ?? options[0];

const isSupportedSolution = (
  solution: string | undefined
): solution is SupportedSolution =>
  solution === 'nightshift' || solution === 'es';

interface NightshiftStatusControlProps {
  /**
   * Active space stream — the control hides itself unless the active
   * space's `solution` is one of `SupportedSolution` (`'nightshift'` for
   * the obs flow, `'es'` for the Search flow). In every other solution
   * the dropdown renders nothing.
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
 * icons / colors for.
 *
 * Visibility / option set is solution-scoped:
 *  - In the obs `'nightshift'` solution, the dropdown exposes
 *    Loading / Healthy / Morning / Critical.
 *  - In the `'es'` (Search) solution, it exposes a single `Search`
 *    option, and the global status auto-flips to `'search'` on entry so
 *    the Nightshift page renders the Search variant out of the box.
 *  - In every other solution the dropdown is hidden.
 */
export const NightshiftStatusControl: React.FC<NightshiftStatusControlProps> = ({
  activeSpace$,
}) => {
  const { euiTheme } = useEuiTheme();
  const activeSpace = useObservable(activeSpace$);
  const status = useObservable(nightshiftStatus$, nightshiftStatus$.getValue());
  const [isOpen, setIsOpen] = useState(false);

  const solution = activeSpace?.solution;
  const supportedSolution = isSupportedSolution(solution) ? solution : undefined;

  /*
   * Keep the global Nightshift status in sync with the active solution.
   * Each solution exposes its own subset of statuses (see
   * `STATUS_OPTIONS_BY_SOLUTION`); on solution switch we flip the
   * global status to the first valid option for the new solution so
   * the page never renders content for a status that isn't selectable
   * in the visible menu.
   *
   *  - Entering `'es'` (Search): if the current status isn't one of
   *    the Search options, default to `'vectordb'` so the VectorDB
   *    Nightshift surface renders out of the box.
   *  - Entering `'nightshift'`: if the current status is a Search-only
   *    status, fall back to `'loading'` (the obs welcome state).
   */
  useEffect(() => {
    if (supportedSolution === 'es') {
      const isSearchStatus = status === 'vectordb' || status === 'search';
      if (!isSearchStatus) {
        setNightshiftStatus('vectordb');
      }
    } else if (supportedSolution === 'nightshift') {
      const isSearchStatus = status === 'vectordb' || status === 'search';
      if (isSearchStatus) {
        setNightshiftStatus('loading');
      }
    }
  }, [supportedSolution, status]);

  if (!supportedSolution) {
    return null;
  }

  const options = STATUS_OPTIONS_BY_SOLUTION[supportedSolution];
  const current = getOption(status, options);

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
        items={options.map((option) => (
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
