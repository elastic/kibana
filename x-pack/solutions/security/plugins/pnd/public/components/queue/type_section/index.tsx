/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { css } from '@emotion/react';
import { EuiAccordion, useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';

import { SectionHeader } from '../../section_header';
import type { SectionDotColor } from '../../section_header';
import * as i18n from '../translations';

const SECTION_RADIUS_PX = 8;
const TRIGGER_PADDING_INLINE_END_PX = 24;
const TRIGGER_PADDING_INLINE_START_PX = 12;

export interface TypeSectionProps {
  children: React.ReactNode;
  /** Pending-only count. Resolved rows belong in the record section, not here. */
  count: number;
  dotColor?: SectionDotColor;
  isOpen?: boolean;
  label: string;
  onToggle?: (isOpen: boolean) => void;
  sectionId: string;
}

/**
 * Collapsible type bucket: severity dot, type label, pending-only count badge,
 * plain rows with 1px dividers, no per-row card chrome. No `+N more` fold —
 * that is thread-mode only (Q7).
 */
export const TypeSection: React.FC<TypeSectionProps> = ({
  children,
  count,
  dotColor,
  isOpen = true,
  label,
  onToggle,
  sectionId,
}) => {
  const { euiTheme } = useEuiTheme();
  const accordionId = useGeneratedHtmlId({ prefix: `pndQueueTypeSection-${sectionId}` });

  const onAccordionToggle = useCallback(
    (nextIsOpen: boolean) => onToggle?.(nextIsOpen),
    [onToggle]
  );

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
      data-test-subj={`pndQueueTypeSection-${sectionId}`}
    >
      <EuiAccordion
        arrowDisplay="left"
        buttonContent={
          <SectionHeader
            count={count}
            countTestSubj={`pndQueueTypeSectionCount-${sectionId}`}
            dotColor={dotColor}
            label={label}
          />
        }
        buttonProps={{
          'aria-label': i18n.typeSectionAriaLabel({ count, label }),
          'data-test-subj': `pndQueueTypeSectionToggle-${sectionId}`,
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
        onToggle={onAccordionToggle}
        paddingSize="none"
      >
        <div
          css={css`
            display: flex;
            flex-direction: column;
            inline-size: 100%;
          `}
        >
          {children}
        </div>
      </EuiAccordion>
    </div>
  );
};
