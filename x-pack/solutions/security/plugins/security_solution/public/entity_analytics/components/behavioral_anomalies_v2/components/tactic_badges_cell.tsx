/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Tactic column cell for the BA-v.2 anomalies table.
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
 * Cleanup: deleted with the rest of `behavioral_anomalies_v2/`.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { ANOMALIES_TABLE_V2_TACTIC_POPOVER_TITLE } from '../translations';
import {
  BEHAVIORAL_ANOMALIES_V2_TABLE_TACTIC_BADGE_TEST_ID,
  BEHAVIORAL_ANOMALIES_V2_TABLE_TACTIC_OVERFLOW_TEST_ID,
  BEHAVIORAL_ANOMALIES_V2_TABLE_TACTIC_POPOVER_TEST_ID,
} from '../test_ids';

interface TacticBadgesCellV2Props {
  tactics: string[];
}

/** Delay before closing the popover so users can move the cursor into it. */
const CLOSE_DELAY_MS = 100;

export const TacticBadgesCellV2: React.FC<TacticBadgesCellV2Props> = ({ tactics }) => {
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
    <EuiFlexGroup
      gutterSize="xs"
      responsive={false}
      alignItems="center"
      css={css`
        flex-wrap: nowrap;
        min-width: 0;
      `}
    >
      {/* First-badge cell shrinks with the column so long tactic names
          collapse to an ellipsis instead of pushing the +N badge out of view.
          The badge itself is `max-width: 100%` so the inner span can clip.
          The +N badge cell stays `grow={false}` and is not truncated. */}
      <EuiFlexItem
        grow={1}
        css={css`
          min-width: 0;
        `}
      >
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
            data-test-subj={BEHAVIORAL_ANOMALIES_V2_TABLE_TACTIC_BADGE_TEST_ID}
            css={css`
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
            `}
          >
            {firstTactic}
          </EuiBadge>
        </EuiToolTip>
      </EuiFlexItem>
      {overflowCount > 0 && (
        <EuiFlexItem grow={false}>
          <EuiPopover
            isOpen={isOpen}
            closePopover={close}
            panelPaddingSize="s"
            anchorPosition="downCenter"
            ownFocus={false}
            data-test-subj={BEHAVIORAL_ANOMALIES_V2_TABLE_TACTIC_POPOVER_TEST_ID}
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
                data-test-subj={BEHAVIORAL_ANOMALIES_V2_TABLE_TACTIC_OVERFLOW_TEST_ID}
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
              <EuiPopoverTitle>{ANOMALIES_TABLE_V2_TACTIC_POPOVER_TITLE}</EuiPopoverTitle>
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
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
