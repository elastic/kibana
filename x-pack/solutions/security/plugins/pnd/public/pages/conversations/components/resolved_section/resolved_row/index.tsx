/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import type { PndProposalRow } from '@kbn/pnd-common';

import { deriveAnsweredBy } from '../../../helpers/answered_by';
import * as briefI18n from '../../../translations';
import * as i18n from './translations';

/** The prototype's resolved-row metrics, which are finer-grained than the EUI scales. */
const ICON_DIAMETER_PX = 20;
const META_FONT_SIZE_PX = 12;
const ROW_LINE_HEIGHT_PX = 18;
const TITLE_FONT_SIZE_PX = 13;
const TITLE_MAX_WIDTH_WITH_NOTE = '42%';
const TITLE_MAX_WIDTH_WITHOUT_NOTE = '60%';
const VERTICAL_PADDING_PX = 10;

/**
 * The icon for how a gate was settled, keyed off the same three-way source the outcome label uses.
 *
 * `bolt` for either auto-respond origin and `user` for a person are the prototype's own choices. `unrecorded`
 * has no prototype counterpart — the prototype's fixtures always know who acted — so it takes
 * `questionInCircle`: the row is saying "something settled this and nothing stamped it", and a `user`
 * glyph there would draw a person who may not exist.
 */
const SOURCE_ICON = {
  autonomy_auto: 'bolt',
  autonomy_dial: 'bolt',
  responder: 'user',
  unrecorded: 'questionInCircle',
} as const;

export interface ResolvedRowProps {
  /**
   * Opens the four-phase lifecycle for this row's discovery. Not called for a row whose gate was
   * never correlated to one — see {@link ResolvedRow}.
   */
  onViewLifecycle: (correlationId: string) => void;
  proposal: PndProposalRow;
}

/**
 * One answered gate, as a single line.
 *
 * Deliberately much smaller than the queue's rows above it (annotation from the prototype's
 * `BlackHatResolvedEventRow`): the record is scanned, not worked, so the row carries only what tells
 * an approver whether this is the answer they were looking for — what it was, when it was settled,
 * the rationale, and who settled it. Everything else about the gate is one click away in the
 * lifecycle, which is what the whole row opens.
 *
 * **The decision drives the tone and the outcome drives the icon, and they are two different
 * things.** A dismissal is `danger`-toned because that is how the queue's own decision badge draws
 * it, so the record and the queue cannot disagree about what a dismissal looks like; the icon
 * instead says *who* settled it, which is the part `deriveAnsweredBy` is careful about (D12) — an
 * auto-respond must never be drawn as a person's decision.
 *
 * A gate with no correlated discovery has no lifecycle to open, so the row is not a button at all
 * rather than a button that does nothing, and the tooltip says why.
 */
export const ResolvedRow: React.FC<ResolvedRowProps> = ({ onViewLifecycle, proposal }) => {
  const { euiTheme } = useEuiTheme();
  const { correlationId, decision, rationale, respondedAt, respondedBy, threadTitle, title } =
    proposal;

  const answeredBy = useMemo(
    () => deriveAnsweredBy({ rationale, respondedBy }),
    [rationale, respondedBy]
  );

  // the thread's title is the name a person gave this work; the gate prompt is the fallback
  const headline = threadTitle != null && threadTitle.length > 0 ? threadTitle : title;
  const note = rationale != null && rationale.trim().length > 0 ? rationale : undefined;
  const isDismissal = decision === 'dismiss';
  const isCorrelated = correlationId.length > 0;

  const onClick = useCallback(() => {
    onViewLifecycle(correlationId);
  }, [correlationId, onViewLifecycle]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onViewLifecycle(correlationId);
      }
    },
    [correlationId, onViewLifecycle]
  );

  const row = (
    <div
      aria-label={isCorrelated ? i18n.openLifecycleAriaLabel(headline) : undefined}
      css={css`
        align-items: center;
        cursor: ${isCorrelated ? 'pointer' : 'default'};
        display: flex;
        flex-direction: row;
        gap: ${euiTheme.size.s};
        padding: ${VERTICAL_PADDING_PX}px ${euiTheme.size.l};

        &:hover {
          background-color: ${isCorrelated ? euiTheme.colors.backgroundBaseSubdued : 'transparent'};
        }
      `}
      data-decision={decision}
      data-test-subj="pndResolvedRow"
      onClick={isCorrelated ? onClick : undefined}
      onKeyDown={isCorrelated ? onKeyDown : undefined}
      role={isCorrelated ? 'button' : undefined}
      tabIndex={isCorrelated ? 0 : undefined}
    >
      <span
        aria-hidden
        css={css`
          align-items: center;
          background: ${isDismissal
            ? euiTheme.colors.backgroundBaseDanger
            : euiTheme.colors.backgroundBaseSuccess};
          border-radius: 50%;
          color: ${isDismissal ? euiTheme.colors.textDanger : euiTheme.colors.textSuccess};
          display: inline-flex;
          flex: none;
          height: ${ICON_DIAMETER_PX}px;
          justify-content: center;
          width: ${ICON_DIAMETER_PX}px;
        `}
        data-answered-by={answeredBy.source}
      >
        <EuiIcon size="s" type={SOURCE_ICON[answeredBy.source]} aria-hidden={true} />
      </span>

      <span
        css={css`
          color: ${euiTheme.colors.textHeading};
          flex: none;
          font-size: ${TITLE_FONT_SIZE_PX}px;
          font-weight: ${euiTheme.font.weight.medium};
          line-height: ${ROW_LINE_HEIGHT_PX}px;
          max-width: ${note != null ? TITLE_MAX_WIDTH_WITH_NOTE : TITLE_MAX_WIDTH_WITHOUT_NOTE};
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        `}
        data-test-subj="pndResolvedRowTitle"
      >
        {headline}
      </span>

      {/* absent on a gate nothing stamped a time on; the outcome label already says it is unrecorded */}
      {respondedAt != null && (
        <time
          css={css`
            color: ${euiTheme.colors.textSubdued};
            flex: none;
            font-size: ${META_FONT_SIZE_PX}px;
            line-height: ${ROW_LINE_HEIGHT_PX}px;
            white-space: nowrap;
          `}
          dateTime={respondedAt}
          data-test-subj="pndResolvedRowRespondedAt"
        >
          <FormattedRelative value={respondedAt} />
        </time>
      )}

      {note != null ? (
        <span
          css={css`
            color: ${euiTheme.colors.textSubdued};
            flex: 1;
            font-size: ${META_FONT_SIZE_PX}px;
            line-height: ${ROW_LINE_HEIGHT_PX}px;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          `}
          data-test-subj="pndResolvedRowNote"
        >
          {note}
        </span>
      ) : (
        <span
          aria-hidden
          css={css`
            flex: 1;
          `}
        />
      )}

      {/* the decision, then who settled it: the outcome is metadata, not a second title */}
      <span
        css={css`
          color: ${euiTheme.colors.textSubdued};
          flex: none;
          font-size: ${META_FONT_SIZE_PX}px;
          font-weight: ${euiTheme.font.weight.regular};
          line-height: ${ROW_LINE_HEIGHT_PX}px;
          white-space: nowrap;
        `}
        data-test-subj="pndResolvedRowOutcome"
      >
        {`${isDismissal ? briefI18n.DISMISSED : briefI18n.APPROVED} · ${answeredBy.label}`}
      </span>
    </div>
  );

  return isCorrelated ? (
    row
  ) : (
    <EuiToolTip content={i18n.UNCORRELATED} disableScreenReaderOutput>
      {row}
    </EuiToolTip>
  );
};
