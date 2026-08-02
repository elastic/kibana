/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';

import { EntityChip } from '../../../entity_chip';
import { ENTITY_CHIP_ROW_GAP_PX, EntityChipRow } from '../../../entity_chip_row';
import { useMeasuredWidth } from '../../../../hooks/use_measured_width';
import { getVisibleChipCount } from '../helpers/get_visible_chip_count';
import type { PndBlastRadiusEntity } from '../helpers/merge_discovery_entities';
import * as i18n from '../translations';

/** How tall the collapsed chip row is allowed to grow before a `+N` chip takes over. */
const MAX_CHIP_ROWS = 2;

const MEASURE_CHIP_TEST_SUBJ = 'blast-radius-measure-chip';
const MEASURE_OVERFLOW_TEST_SUBJ = 'blast-radius-measure-overflow';

/** What the hidden row reports: the width of every chip, and of the `+N` chip beside them. */
interface MeasuredChipWidths {
  chipWidths: number[];
  overflowChipWidth: number;
}

const NOT_MEASURED: MeasuredChipWidths = { chipWidths: [], overflowChipWidth: 0 };

export interface BlastRadiusChipsProps {
  /** The entity id the queue is filtered by, or `null` when it is not filtered. */
  activeEntityId: string | null;
  /** Merged and ordered by {@link mergeDiscoveryEntities}; never empty. */
  entities: PndBlastRadiusEntity[];
  onToggleEntity: (entity: PndBlastRadiusEntity) => void;
}

/**
 * The chip row itself, and the measurement that decides how much of it to draw.
 *
 * **The overflow is measured, not guessed.** A hidden duplicate row reports how wide every chip
 * turned out to be — including the `+N` chip, which needs room of its own — and
 * {@link getVisibleChipCount} decides how many fit inside {@link MAX_CHIP_ROWS}. The rule lives in a
 * helper so it can be tested without a layout engine; the DOM here only supplies pixels. Until the
 * row has been laid out every chip is drawn, because a collapsed row is a claim that the rest do not
 * fit and an unmeasured row has no grounds to make it.
 *
 * Split from {@link BlastRadius} rather than folded into it because the section renders nothing until
 * the enrichment lands: a `ResizeObserver` attached before then would have no row to observe, and
 * would never re-attach when one appeared.
 */
export const BlastRadiusChips: React.FC<BlastRadiusChipsProps> = ({
  activeEntityId,
  entities,
  onToggleEntity,
}) => {
  const { ref: rowRef, width } = useMeasuredWidth<HTMLDivElement>();
  const measureRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<MeasuredChipWidths>(NOT_MEASURED);
  const [isExpanded, setIsExpanded] = useState(false);

  useLayoutEffect(() => {
    const node = measureRef.current;

    if (node == null) {
      return;
    }

    const measureChips = node.querySelectorAll<HTMLElement>(
      `[data-test-subj="${MEASURE_CHIP_TEST_SUBJ}"]`
    );
    const measureOverflow = node.querySelector<HTMLElement>(
      `[data-test-subj="${MEASURE_OVERFLOW_TEST_SUBJ}"]`
    );

    setMeasured({
      chipWidths: [...measureChips].map(({ offsetWidth }) => offsetWidth),
      overflowChipWidth: measureOverflow?.offsetWidth ?? 0,
    });
  }, [entities, width]);

  const onExpand = useCallback(() => setIsExpanded(true), []);
  const onCollapse = useCallback(() => setIsExpanded(false), []);

  // The hidden row is measured after the chips it describes have rendered, so one render lands with a
  // stale count. Drawing every chip until the two agree keeps that render from hiding chips that fit.
  const isMeasured = width > 0 && measured.chipWidths.length === entities.length;

  const visibleCount = useMemo(
    () =>
      isExpanded || !isMeasured
        ? entities.length
        : getVisibleChipCount({
            activeIndex: entities.findIndex(({ id }) => id === activeEntityId),
            chipWidths: measured.chipWidths,
            containerWidth: width,
            gapPx: ENTITY_CHIP_ROW_GAP_PX,
            maxRows: MAX_CHIP_ROWS,
            overflowChipWidth: measured.overflowChipWidth,
          }),
    [activeEntityId, entities, isExpanded, isMeasured, measured, width]
  );

  const overflowCount = entities.length - visibleCount;

  return (
    <div
      css={css`
        position: relative;
        width: 100%;
      `}
      data-test-subj="pndBlastRadiusChipRow"
      ref={rowRef}
    >
      <div
        aria-hidden={true}
        css={css`
          height: 0;
          overflow: hidden;
          pointer-events: none;
          position: absolute;
          visibility: hidden;
          width: 100%;
        `}
        data-test-subj="pndBlastRadiusMeasureRow"
        ref={measureRef}
      >
        <EntityChipRow>
          {entities.map(({ count, id, value }) => (
            <EntityChip
              count={count}
              data-test-subj={MEASURE_CHIP_TEST_SUBJ}
              isInteractive={false}
              key={id}
              label={value}
            />
          ))}

          {/* The widest `+N` this row could draw, so the room reserved for it is never short. */}
          <EntityChip
            data-test-subj={MEASURE_OVERFLOW_TEST_SUBJ}
            isInteractive={false}
            label={i18n.blastRadiusOverflowLabel(entities.length)}
          />
        </EntityChipRow>
      </div>

      <EntityChipRow>
        {entities.slice(0, visibleCount).map((entity) => (
          <EntityChip
            ariaLabel={i18n.blastRadiusChipAriaLabel({
              count: entity.count,
              field: entity.field,
              value: entity.value,
            })}
            count={entity.count}
            data-test-subj="blast-radius-chip"
            isActive={entity.id === activeEntityId}
            key={entity.id}
            label={entity.value}
            onClick={() => onToggleEntity(entity)}
          />
        ))}

        {isExpanded && (
          <EntityChip
            ariaLabel={i18n.BLAST_RADIUS_COLLAPSE_ARIA_LABEL}
            data-test-subj="blast-radius-collapse"
            iconType="arrowLeft"
            onClick={onCollapse}
          />
        )}

        {!isExpanded && overflowCount > 0 && (
          <EntityChip
            ariaLabel={i18n.blastRadiusOverflowAriaLabel(overflowCount)}
            data-test-subj="blast-radius-overflow"
            label={i18n.blastRadiusOverflowLabel(overflowCount)}
            onClick={onExpand}
          />
        )}
      </EntityChipRow>
    </div>
  );
};
