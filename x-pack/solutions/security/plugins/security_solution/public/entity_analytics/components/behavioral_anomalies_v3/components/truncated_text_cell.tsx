/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * BA-v.3 prototype helper: renders a table-cell text value with single-line
 * ellipsis truncation, and only wraps it in an `EuiToolTip` when the content
 * is actually overflowing its container. Avoids the "tooltip on hover even
 * though the full value is already visible" noise the v.3 design calls out.
 *
 * Used by the right-panel Recent anomalies table and the left-tab Anomalies
 * table (BA-v.3 only). The two existing in-place EuiToolTip wrappers in
 * `anomalies_table_section.tsx`, `behavioral_anomalies_overview_v3.tsx`,
 * and `anomaly_job_name_cell.tsx` were replaced by this component.
 *
 * Implementation notes:
 *  - Truncation CSS sits on the element directly containing the text (the
 *    inner span). Putting it on an outer wrapper whose only child is an
 *    inline-block (e.g. EuiToolTip's default anchor) makes the browser
 *    clip the text without drawing the ellipsis.
 *  - Overflow is measured with `scrollWidth > clientWidth` on the truncating
 *    span. We re-measure on every `children` change AND on every container
 *    resize via `ResizeObserver` (catches flyout open animations, panel
 *    width changes, and column-width recomputations that finalize after
 *    mount). `useLayoutEffect` runs the first measurement synchronously
 *    before paint, so the first frame already reflects the correct
 *    truncation state.
 *  - When overflowing we wrap the SAME ref'd span in `EuiToolTip` (instead
 *    of swapping the structure), so the ref stays attached and we keep
 *    re-measuring as the cell width changes.
 *
 * Cleanup: deletes with the rest of the BA-v.3 prototype.
 */

import React, { useLayoutEffect, useRef, useState } from 'react';
import { EuiText, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';

// Truncation CSS for the ref'd inner span. `display: block` + `width: 100%`
// + `min-width: 0` lets the span shrink below its intrinsic content width
// inside the flex/table cell so `text-overflow: ellipsis` actually kicks in.
const truncatedSpanCss = css`
  display: block;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

// Anchor wrapper CSS for the EuiToolTip variant. Forces the anchor to fill
// the parent cell so the inner truncating span continues to receive the
// cell's full available width (otherwise the default `inline-block` anchor
// would shrink-wrap the truncated content and the tooltip would never
// reappear once the user widens the column).
const tooltipAnchorCss = css`
  display: block;
  width: 100%;
  min-width: 0;
  max-width: 100%;
`;

interface TruncatedTextCellV3Props {
  /**
   * The content rendered inside the cell. Must be inline-renderable
   * (string or inline element) so that single-line truncation works.
   */
  children: React.ReactNode;
  /**
   * Tooltip content shown ONLY when `children` overflow the cell width.
   * Pass a plain string for accessibility-friendly tooltips; pass a node
   * when the visible cell contains an interactive element (e.g. a link)
   * but the tooltip should show the unstyled value.
   */
  tooltipContent: React.ReactNode;
  /** Forwarded to the truncating inner span (handy for tests / debugging). */
  ['data-test-subj']?: string;
}

export const TruncatedTextCellV3: React.FC<TruncatedTextCellV3Props> = ({
  children,
  tooltipContent,
  'data-test-subj': dataTestSubj,
}) => {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      // Sub-pixel rounding can produce scrollWidth = clientWidth + 0.5 even
      // when the text fits perfectly; require a >1px overflow to avoid a
      // false-positive tooltip on the exact-fit case.
      setIsOverflowing(el.scrollWidth - el.clientWidth > 1);
    };
    check();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [children]);

  const innerSpan = (
    <span ref={ref} css={truncatedSpanCss} data-test-subj={dataTestSubj}>
      <EuiText size="xs" component="span">
        {children}
      </EuiText>
    </span>
  );

  if (!isOverflowing) return innerSpan;

  return (
    <EuiToolTip content={tooltipContent} anchorProps={{ css: tooltipAnchorCss }}>
      {innerSpan}
    </EuiToolTip>
  );
};
