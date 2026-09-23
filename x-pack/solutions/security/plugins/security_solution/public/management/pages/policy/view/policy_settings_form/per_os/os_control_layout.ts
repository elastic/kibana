/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';

/*
 * Shared layout constants for per-OS rows.
 *
 * These live in one place on purpose. Every card renders the same row shape — OS label, then a
 * control — so the widths have to agree across cards or the columns visibly stagger. When each
 * component owned its own value they drifted: the protection-mode select was given a fixed width
 * while the antivirus and device-control selects kept resizing with their selection.
 */

/**
 * Design-fixed OS label column. Sized for the longest label, "Windows", so the control column
 * begins at the same offset on every row of every card. Reset to `auto` below the `s` breakpoint.
 */
export const OS_LABEL_COLUMN_WIDTH = '5rem';

/**
 * Fixed width for the primary control on an OS row.
 *
 * Two reasons it is fixed rather than intrinsic: the control must not resize as the user changes
 * selection, and an `EuiSuperSelect` popover inherits the control's width — anything narrower
 * wraps the longest option onto two lines.
 *
 * Sized for the longest option text across every per-OS select, which is the antivirus
 * "Sync with malware protection level" (~14.25rem of Inter at the form-control `s` size of 14px).
 * Longer than the protection mode "Detect & prevent" and the device-control
 * "Allow read, write and execute". Add the `EuiHealth` severity dot (1rem) and its `xs` gap
 * (0.25rem), plus `EuiSuperSelect` padding (`size.m` = 0.75rem each side) and the chevron's
 * `iconAffordance` (1.5rem). That is ~18.5rem occupied; 18rem clips the selected label under the
 * chevron. 22rem leaves headroom so the English string and the inherited popover width stay on
 * one line. If a longer option is ever added, widen this rather than overriding a single
 * component. Translated strings that still overflow truncate in `os_control_select_options.tsx`.
 */
export const OS_CONTROL_WIDTH = '22rem';

/**
 * Spacing and surface for the panel that sits below an OS row's controls: the notify-user panel,
 * the Linux session-data panel and the supplemental event-collection panel. Shared so they cannot
 * drift; they previously used different spacing (a `marginTop` token versus an `EuiSpacer`),
 * which read as a misalignment between cards.
 *
 * The panels use `EuiPanel`'s `subdued` surface for that separation. Everything about their
 * appearance comes from `EuiPanel` props; the only thing this helper contributes is the top
 * margin.
 */
export const osRowPanelCss = ({ euiTheme }: UseEuiTheme) => ({
  marginTop: euiTheme.size.m,
});
