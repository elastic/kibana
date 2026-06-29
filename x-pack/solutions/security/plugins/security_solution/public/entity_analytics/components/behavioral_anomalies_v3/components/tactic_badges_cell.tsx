/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Tactic column cell for the BA-v.3 anomalies table.
 *
 * Renders the first MITRE ATT&CK tactic as a hollow EuiBadge inline, and when
 * the row has more than one tactic, a second hollow "+N" badge that opens a
 * popover on hover. The popover content reuses the Detection rules "tags
 * popover" layout (title + group of hollow EuiBadges).
 *
 * Trigger interaction mirrors `TagsPopover` in
 * `entity_analytics/components/threat_hunting/.../shared_lead_components.tsx`
 * so hover-to-open with a small close delay behaves consistently across the
 * plugin. Click toggles the popover for keyboard / touch users.
 *
 * Cleanup: deleted with the rest of `behavioral_anomalies_v3/`.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiPopover,
  EuiPopoverTitle,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { ANOMALIES_TABLE_V3_TACTIC_POPOVER_TITLE } from '../translations';
import {
  BEHAVIORAL_ANOMALIES_V3_TABLE_TACTIC_BADGE_TEST_ID,
  BEHAVIORAL_ANOMALIES_V3_TABLE_TACTIC_OVERFLOW_TEST_ID,
  BEHAVIORAL_ANOMALIES_V3_TABLE_TACTIC_POPOVER_TEST_ID,
} from '../test_ids';

interface TacticBadgesCellV3Props {
  tactics: string[];
}

/** Delay before closing the popover so users can move the cursor into it. */
const CLOSE_DELAY_MS = 100;

export const TacticBadgesCellV3: React.FC<TacticBadgesCellV3Props> = ({ tactics }) => {
  const [isOpen, setIsOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    []
  );

  const open = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setIsOpen(true);
  }, []);

  const scheduleClose = useCallback(() => {
    closeTimer.current = setTimeout(() => setIsOpen(false), CLOSE_DELAY_MS);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  const overflowCount = useMemo(() => Math.max(0, tactics.length - 1), [tactics.length]);

  if (tactics.length === 0) {
    return null;
  }

  const firstTactic = tactics[0];

  return (
    // Plain flex wrapper (not `EuiFlexGroup`) so the first badge cell can
    // be configured as `flex: 0 1 auto` — i.e. it doesn't grow past its
    // content width but still shrinks (and truncates) when the column is
    // narrower than the combined natural badge widths. `EuiFlexGroup` /
    // `EuiFlexItem grow={1}` would force the cell to expand to fill the
    // column, pushing the +N badge to the right and leaving a variable
    // gap between the two badges. `EuiFlexItem grow={false}` would zero
    // both grow AND shrink, breaking the truncation. The plain `gap` is
    // an absolute 4 px so the inter-badge distance never drifts with
    // column width.
    <div css={tacticCellCss}>
      {/* First-badge slot — `min-width: 0` lets the badge shrink below
          its natural width so `text-overflow: ellipsis` can kick in
          when the column is too narrow. The badge itself caps at
          `max-width: 100%` so the inner text actually clips. */}
      <div css={firstBadgeSlotCss}>
        <EuiToolTip
          content={firstTactic}
          anchorProps={{
            css: css`
              display: block;
              min-width: 0;
              max-width: 100%;
            `,
          }}
        >
          <EuiBadge
            color="hollow"
            data-test-subj={BEHAVIORAL_ANOMALIES_V3_TABLE_TACTIC_BADGE_TEST_ID}
            css={badgeTruncationCss}
          >
            {firstTactic}
          </EuiBadge>
        </EuiToolTip>
      </div>
      {overflowCount > 0 && (
        <div css={overflowBadgeSlotCss}>
          <EuiPopover
            isOpen={isOpen}
            closePopover={close}
            panelPaddingSize="s"
            anchorPosition="downCenter"
            ownFocus={false}
            data-test-subj={BEHAVIORAL_ANOMALIES_V3_TABLE_TACTIC_POPOVER_TEST_ID}
            button={
              <span
                role="button"
                tabIndex={0}
                onMouseEnter={open}
                onMouseLeave={scheduleClose}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen((prev) => !prev);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOpen((prev) => !prev);
                  }
                }}
                data-test-subj={BEHAVIORAL_ANOMALIES_V3_TABLE_TACTIC_OVERFLOW_TEST_ID}
              >
                <EuiBadge color="hollow">{`+${overflowCount}`}</EuiBadge>
              </span>
            }
          >
            <div
              onMouseEnter={open}
              onMouseLeave={scheduleClose}
              css={css`
                max-width: 320px;
              `}
            >
              <EuiPopoverTitle>{ANOMALIES_TABLE_V3_TACTIC_POPOVER_TITLE}</EuiPopoverTitle>
              <EuiBadgeGroup
                gutterSize="xs"
                css={css`
                  max-height: 200px;
                  overflow: auto;
                `}
              >
                {tactics.map((tactic) => (
                  <EuiBadge color="hollow" key={tactic}>
                    {tactic}
                  </EuiBadge>
                ))}
              </EuiBadgeGroup>
            </div>
          </EuiPopover>
        </div>
      )}
    </div>
  );
};

// 4 px is an absolute gap, not the EUI `xs` token, because the v.3 design
// explicitly calls for a fixed inter-badge distance that doesn't track the
// theme spacing scale.
const tacticCellCss = css`
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 4px;
  min-width: 0;
`;

const firstBadgeSlotCss = css`
  flex: 0 1 auto;
  min-width: 0;
  max-width: 100%;
`;

const overflowBadgeSlotCss = css`
  flex: 0 0 auto;
`;

const badgeTruncationCss = css`
  max-width: 100%;
  & .euiBadge__content,
  & .euiBadge__text {
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: block;
  }
`;
