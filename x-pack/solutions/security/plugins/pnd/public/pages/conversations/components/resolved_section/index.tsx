/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiButtonEmpty, useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';
import { css } from '@emotion/react';
import type { PndProposalRow } from '@kbn/pnd-common';
import React, { useCallback, useState } from 'react';

import { SectionHeader } from '../../../../components/section_header';
import { ResolvedRow } from './resolved_row';
import * as i18n from './translations';

const SECTION_RADIUS_PX = 8;
const TRIGGER_PADDING_INLINE_END_PX = 24;
const TRIGGER_PADDING_INLINE_START_PX = 12;

/** How many rows the record shows before it asks to be expanded, and how many each click adds. */
export const RESOLVED_PREVIEW_COUNT = 10;

export interface ResolvedSectionProps {
  /** Opens the lifecycle for a row's correlated discovery. */
  onViewLifecycle: (correlationId: string) => void;
  /** Everything the queue has answered, newest first. */
  rows: PndProposalRow[];
}

/**
 * The record of every answered gate, as the fifth section of the queue rather than a flyout over it.
 *
 * Inline because the record's job is comparison: "have we seen this before, and what did we do?" is
 * asked *while* reading a pending approval, and a flyout answered it by covering the very row that
 * raised the question. A collapsed section keeps the answer one click away without spending vertical
 * space on it, and — unlike the flyout — cannot be reached by a URL that outlives the queue behind it.
 *
 * Rows are capped at a preview rather than paged: the queue's own sections are the working surface,
 * and an unbounded record below them would push them off the page on a busy day. Each click adds
 * another {@link RESOLVED_PREVIEW_COUNT}, and the button names how many are left so the count is
 * known before the click rather than after it.
 *
 * Absent entirely when nothing has been answered yet, rather than drawn as an empty section: on a
 * first run there is no record to speak of, and a header reading "Resolved 0" is noise the four
 * sections above it do not need. The queue's own empty state covers the genuinely-empty page.
 */
export const ResolvedSection: React.FC<ResolvedSectionProps> = ({ onViewLifecycle, rows }) => {
  const { euiTheme } = useEuiTheme();
  const accordionId = useGeneratedHtmlId({ prefix: 'pndBriefResolvedAccordion' });

  const [isOpen, setIsOpen] = useState(true);
  const [visibleCount, setVisibleCount] = useState(RESOLVED_PREVIEW_COUNT);

  const onShowMore = useCallback(
    () => setVisibleCount((count) => count + RESOLVED_PREVIEW_COUNT),
    []
  );

  const remaining = rows.length - visibleCount;

  if (rows.length === 0) {
    return null;
  }

  return (
    <div
      css={css`
        background: ${euiTheme.colors.emptyShade};
        border: ${euiTheme.border.width.thin} solid ${euiTheme.border.color};
        border-radius: ${SECTION_RADIUS_PX}px;
        display: flex;
        flex-direction: column;
        inline-size: 100%;
        margin-block-end: ${euiTheme.size.l};
        overflow: hidden;
      `}
      data-test-subj="pndBriefResolvedSection"
    >
      <EuiAccordion
        arrowDisplay="left"
        buttonContent={
          <SectionHeader
            count={rows.length}
            countTestSubj="pndBriefResolvedCount"
            dotColor="success"
            label={i18n.RESOLVED}
          />
        }
        buttonProps={{
          'aria-label': i18n.resolvedAccordionAriaLabel(rows.length),
          'data-test-subj': 'pndBriefResolvedToggle',
        }}
        css={css`
          .euiAccordion__triggerWrapper {
            background: ${euiTheme.colors.emptyShade};
            border-block-end: none;
            box-sizing: border-box;
            padding: ${euiTheme.size.m} ${TRIGGER_PADDING_INLINE_END_PX}px ${euiTheme.size.m}
              ${TRIGGER_PADDING_INLINE_START_PX}px;
          }

          &.euiAccordion-isOpen .euiAccordion__triggerWrapper {
            border-block-end: ${euiTheme.border.width.thin} solid ${euiTheme.border.color};
          }
        `}
        forceState={isOpen ? 'open' : 'closed'}
        id={accordionId}
        onToggle={setIsOpen}
        paddingSize="none"
      >
        <div
          css={css`
            display: flex;
            flex-direction: column;
            inline-size: 100%;
          `}
        >
          {rows.slice(0, visibleCount).map((proposal) => (
            <ResolvedRow
              key={proposal.sourceId}
              onViewLifecycle={onViewLifecycle}
              proposal={proposal}
            />
          ))}

          {remaining > 0 && (
            // no border of its own: the last row's own divider already draws the line above this
            <div
              css={css`
                display: flex;
                justify-content: center;
                padding: ${euiTheme.size.xs} 0;
              `}
            >
              <EuiButtonEmpty
                color="text"
                data-test-subj="pndBriefResolvedShowMore"
                iconType="arrowDown"
                onClick={onShowMore}
                size="xs"
              >
                {i18n.showMore(remaining)}
              </EuiButtonEmpty>
            </div>
          )}
        </div>
      </EuiAccordion>
    </div>
  );
};
