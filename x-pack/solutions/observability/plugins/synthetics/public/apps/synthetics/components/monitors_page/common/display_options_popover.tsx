/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiSwitchEvent } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useUrlParams } from '../../../hooks';
import { useOverviewDisplayOptions } from './use_overview_display_options';

/**
 * Compact, popover-based "display options" surface for the overview list.
 *
 * The popover is the single home for view-shaping toggles that don't fit
 * cleanly into the toolbar. Two flavors of options coexist here:
 *
 * - **Cosmetic** (e.g. absolute timestamps): saved to `localStorage` via
 *   `useOverviewDisplayOptions`. Per-user, per-space, never in the URL.
 * - **Semantic** (e.g. `filterByDateRange`): URL-driven so the view is
 *   shareable. The popover just exposes the same control surface.
 *
 * Keeping both kinds in one place is intentional — users only need to know
 * one location to tweak how the overview behaves.
 */
export const DisplayOptionsPopover: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const { options, setOption } = useOverviewDisplayOptions();

  // Filter-by-date-range stays URL-driven even though the toggle lives here.
  // The URL → pageState sync (and the loud refetch when the toggle/range
  // changes) lives in `useSyncDateRangeFilter`, mounted at page level so it
  // keeps working even when the empty-state replaces this popover.
  const [getUrlParams, updateUrlParams] = useUrlParams();
  const { filterByDateRange } = getUrlParams();

  const onToggleFilterByDateRange = useCallback(
    (e: EuiSwitchEvent) => {
      const next = e.target.checked;
      updateUrlParams({ filterByDateRange: next ? 'true' : undefined });
    },
    [updateUrlParams]
  );

  const onToggleAbsoluteTimestamps = useCallback(
    (e: EuiSwitchEvent) => {
      setOption('absoluteTimestamps', e.target.checked);
    },
    [setOption]
  );

  const button = (
    <EuiButtonIcon
      data-test-subj="syntheticsOverviewDisplayOptionsButton"
      iconType="controlsHorizontal"
      aria-label={ARIA_LABEL}
      onClick={() => setIsOpen((prev) => !prev)}
      display={isOpen ? 'fill' : 'base'}
      color="text"
    />
  );

  return (
    <EuiPopover
      id="syntheticsOverviewDisplayOptions"
      button={button}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downRight"
      panelPaddingSize="m"
    >
      <EuiPopoverTitle paddingSize="s">{POPOVER_TITLE}</EuiPopoverTitle>
      <div css={{ minWidth: 280 }}>
        <EuiTitle size="xxxs">
          <h4>{FILTERING_HEADING}</h4>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiSwitch
          compressed
          data-test-subj="syntheticsFilterByDateRangeSwitch"
          checked={Boolean(filterByDateRange)}
          onChange={onToggleFilterByDateRange}
          label={<EuiText size="xs">{FILTER_BY_DATE_RANGE_LABEL}</EuiText>}
        />
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          {FILTER_BY_DATE_RANGE_HINT}
        </EuiText>

        <EuiHorizontalRule margin="m" />

        <EuiTitle size="xxxs">
          <h4>{DISPLAY_HEADING}</h4>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiSwitch
          compressed
          data-test-subj="syntheticsAbsoluteTimestampsSwitch"
          checked={options.absoluteTimestamps}
          onChange={onToggleAbsoluteTimestamps}
          label={<EuiText size="xs">{ABSOLUTE_TIMESTAMPS_LABEL}</EuiText>}
        />
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          {ABSOLUTE_TIMESTAMPS_HINT}
        </EuiText>

        <EuiHorizontalRule margin="m" />

        <EuiFlexGroup justifyContent="flexEnd" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              data-test-subj="syntheticsDisplayOptionsResetButton"
              onClick={() => {
                setOption('absoluteTimestamps', false);
                updateUrlParams({ filterByDateRange: undefined });
              }}
            >
              {RESET_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </EuiPopover>
  );
};

const ARIA_LABEL = i18n.translate('xpack.synthetics.overview.displayOptions.ariaLabel', {
  defaultMessage: 'Display options',
});

const POPOVER_TITLE = i18n.translate('xpack.synthetics.overview.displayOptions.title', {
  defaultMessage: 'Display options',
});

const FILTERING_HEADING = i18n.translate(
  'xpack.synthetics.overview.displayOptions.filteringHeading',
  {
    defaultMessage: 'Filtering',
  }
);

const DISPLAY_HEADING = i18n.translate('xpack.synthetics.overview.displayOptions.displayHeading', {
  defaultMessage: 'Display',
});

const FILTER_BY_DATE_RANGE_LABEL = i18n.translate(
  'xpack.synthetics.overview.displayOptions.filterByDateRangeLabel',
  { defaultMessage: 'Filter by date range' }
);

const FILTER_BY_DATE_RANGE_HINT = i18n.translate(
  'xpack.synthetics.overview.displayOptions.filterByDateRangeHint',
  {
    defaultMessage:
      'Restrict the list to monitors with at least one run in the selected date range.',
  }
);

const ABSOLUTE_TIMESTAMPS_LABEL = i18n.translate(
  'xpack.synthetics.overview.displayOptions.absoluteTimestampsLabel',
  { defaultMessage: 'Absolute timestamps' }
);

const ABSOLUTE_TIMESTAMPS_HINT = i18n.translate(
  'xpack.synthetics.overview.displayOptions.absoluteTimestampsHint',
  {
    defaultMessage: 'Show full date and time instead of relative values like "5m ago".',
  }
);

const RESET_LABEL = i18n.translate('xpack.synthetics.overview.displayOptions.resetLabel', {
  defaultMessage: 'Reset to defaults',
});
