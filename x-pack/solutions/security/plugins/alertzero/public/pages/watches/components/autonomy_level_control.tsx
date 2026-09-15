/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef } from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import type { WatchAutonomyLevel } from '@kbn/alertzero-common';
import {
  getAutonomyLevelCards,
  supervisedWarnForWorker,
  type AutonomyLevelCard,
  type LevelCardActor,
  type LevelCardFactPart,
} from './autonomy_level_cards_data';
import * as i18n from '../settings_translations';

const TICK_LABEL: Record<WatchAutonomyLevel, string> = {
  manual: i18n.AUTONOMY_LEVEL_MANUAL_LABEL,
  assisted: i18n.AUTONOMY_LEVEL_ASSISTED_LABEL,
  supervised: i18n.AUTONOMY_LEVEL_SUPERVISED_LABEL,
};

const ACTOR_LABEL: Record<LevelCardActor, string> = {
  you: i18n.AUTONOMY_ACTOR_YOU,
  worker: i18n.AUTONOMY_ACTOR_WORKER,
};

function ActorPill({ actor }: { actor: LevelCardActor }) {
  const isYou = actor === 'you';
  // Standard EUI badges — Worker uses primary; You is hollow.
  return <EuiBadge color={isYou ? 'hollow' : 'primary'}>{ACTOR_LABEL[actor]}</EuiBadge>;
}

function FactParts({ parts }: { parts: LevelCardFactPart[] }) {
  return (
    <>
      {parts.map((part, index) =>
        part.kind === 'pill' ? (
          <ActorPill key={`pill-${index}`} actor={part.actor} />
        ) : (
          <span key={`text-${index}`}>{part.text}</span>
        )
      )}
    </>
  );
}

function LevelCardButton({
  card,
  selected,
  interactive,
  onSelect,
}: {
  card: AutonomyLevelCard;
  selected: boolean;
  interactive: boolean;
  onSelect: () => void;
}) {
  const { euiTheme } = useEuiTheme();
  const cardStyle = css`
    text-align: left;
    padding: 14px 15px 12px;
    /* All level cards share Plain fill; selection is border-only. */
    background: ${euiTheme.colors.backgroundBasePlain};
    border: 1px solid
      ${selected ? euiTheme.colors.borderBasePrimary : euiTheme.colors.borderBaseSubdued};
    border-radius: ${euiTheme.border.radius.medium};
    box-shadow: ${selected ? `inset 0 0 0 1px ${euiTheme.colors.borderBasePrimary}` : 'none'};
    color: ${selected ? euiTheme.colors.textParagraph : euiTheme.colors.textSubdued};
    cursor: ${interactive ? 'pointer' : 'default'};
    transition: border-color 0.12s ease;
    &:hover {
      border-color: ${interactive || selected
        ? euiTheme.colors.borderBasePrimary
        : euiTheme.colors.borderBaseSubdued};
    }
    &:focus-visible {
      outline: 2px solid ${euiTheme.colors.primary};
      outline-offset: 2px;
    }
  `;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={!interactive}
      onClick={interactive ? onSelect : undefined}
      css={cardStyle}
      data-test-subj={`alertZeroAutonomyCard-${card.level}`}
    >
      <span
        css={css`
          display: block;
          font-weight: ${euiTheme.font.weight.semiBold};
          font-size: 14.5px;
          color: inherit;
        `}
      >
        {TICK_LABEL[card.level]}
      </span>
      <span
        css={css`
          display: block;
          font-size: 12px;
          line-height: 1.5;
          margin-top: 4px;
          min-height: 38px;
          color: inherit;
          opacity: 0.85;
        `}
      >
        {card.who}
      </span>
      <dl
        css={css`
          margin: 10px 0 0;
          padding-top: 10px;
          border-top: 1px solid ${euiTheme.colors.borderBaseSubdued};
          font-size: 11.5px;
          line-height: 1.45;
          display: flex;
          flex-direction: column;
          gap: 12px;
        `}
      >
        {card.facts.map((fact) => (
          <div
            key={fact.label}
            css={css`
              display: flex;
              flex-direction: column;
              gap: 2px;
            `}
          >
            <dt
              css={css`
                margin: 0;
                color: inherit;
                font-size: inherit;
                font-weight: ${euiTheme.font.weight.semiBold};
              `}
            >
              {fact.label}
            </dt>
            <dd
              css={css`
                margin: 0;
                color: inherit;
              `}
            >
              <FactParts parts={fact.parts} />
            </dd>
          </div>
        ))}
      </dl>
    </button>
  );
}

function AutonomyTrack({
  levels,
  index,
  isDisabled,
  onChangeIndex,
}: {
  levels: WatchAutonomyLevel[];
  index: number;
  isDisabled: boolean;
  onChangeIndex: (next: number) => void;
}) {
  const { euiTheme } = useEuiTheme();
  const railRef = useRef<HTMLDivElement>(null);
  const n = levels.length;
  const fraction = n > 1 ? index / (n - 1) : 0;
  const accent = isDisabled ? euiTheme.colors.borderBaseSubdued : euiTheme.colors.primary;

  const indexFromClientX = useCallback(
    (clientX: number) => {
      const el = railRef.current;
      if (!el || n < 2) return 0;
      const rect = el.getBoundingClientRect();
      const ratio = (clientX - rect.left) / Math.max(1, rect.width);
      return Math.min(n - 1, Math.max(0, Math.round(ratio * (n - 1))));
    },
    [n]
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isDisabled) return;
    onChangeIndex(indexFromClientX(event.clientX));
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (isDisabled) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      onChangeIndex(Math.min(n - 1, index + 1));
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      onChangeIndex(Math.max(0, index - 1));
    } else if (event.key === 'Home') {
      event.preventDefault();
      onChangeIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      onChangeIndex(n - 1);
    }
  };

  return (
    <div
      role="slider"
      tabIndex={isDisabled ? -1 : 0}
      aria-disabled={isDisabled}
      aria-valuemin={1}
      aria-valuemax={n}
      aria-valuenow={index + 1}
      aria-valuetext={TICK_LABEL[levels[index] ?? 'manual']}
      aria-label={i18n.AUTONOMY_TRACK_ARIA_LABEL}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      data-test-subj="alertZeroAutonomyTrack"
      css={css`
        cursor: ${isDisabled ? 'not-allowed' : 'pointer'};
        outline: none;
        &:focus-visible .alertZeroAutonomyThumb {
          box-shadow: 0 0 0 3px ${euiTheme.colors.backgroundBasePlain},
            0 0 0 6px ${euiTheme.colors.primary};
        }
      `}
    >
      {/* Inner rail: inset from the hit area so thumb/tick centers align with
          the rail ends; percentage positioning resolves against it. */}
      <div
        ref={railRef}
        css={css`
          position: relative;
          height: 30px;
          margin: 0 9px 12px;
        `}
      >
        <span
          css={css`
            position: absolute;
            left: 0;
            right: 0;
            top: 13px;
            height: 4px;
            border-radius: 2px;
            background: ${euiTheme.colors.borderBaseSubdued};
          `}
        />
        <span
          css={css`
            position: absolute;
            left: 0;
            top: 13px;
            height: 4px;
            border-radius: 2px;
            width: ${(fraction * 100).toFixed(2)}%;
            background: ${accent};
            transition: width 0.22s ease;
          `}
        />
        {levels.map((level, i) => {
          const p = n > 1 ? i / (n - 1) : 0;
          return (
            <span
              key={level}
              css={css`
                position: absolute;
                top: 10px;
                left: ${(p * 100).toFixed(2)}%;
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: ${euiTheme.colors.backgroundBasePlain};
                border: 2px solid ${i <= index ? accent : euiTheme.colors.borderBasePlain};
                transform: translateX(-50%);
                box-sizing: border-box;
              `}
            />
          );
        })}
        <span
          className="alertZeroAutonomyThumb"
          css={css`
            position: absolute;
            top: 6px;
            left: ${(fraction * 100).toFixed(2)}%;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: ${euiTheme.colors.emptyShade};
            border: 3px solid ${accent};
            transform: translateX(-50%);
            transition: left 0.22s ease;
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
            pointer-events: none;
          `}
        />
      </div>
    </div>
  );
}

interface AutonomyLevelControlProps {
  /** Worker whose allowed levels + card copy to resolve. */
  workerId: string;
  current: WatchAutonomyLevel;
  isDisabled?: boolean;
  /** Static read-only rendering (page or Worker locked). */
  staticOnly?: boolean;
  onChange: (next: WatchAutonomyLevel) => void;
}

/**
 * Consequence-forward autonomy control ported from the Sep 11 prototype
 * (AutonomyLevelControl): an accessible drag/click/keyboard track above level
 * cards whose copy describes what each level means for THIS Worker. Cards
 * double as radio buttons; a disabled control renders the track subdued and
 * the cards non-interactive.
 */
export const AutonomyLevelControl: React.FC<AutonomyLevelControlProps> = ({
  workerId,
  current,
  isDisabled = false,
  staticOnly = false,
  onChange,
}) => {
  const { euiTheme } = useEuiTheme();
  const cards = getAutonomyLevelCards(workerId);
  const levels = cards.levels.map((card) => card.level);
  const selectedIndex = Math.max(
    0,
    levels.findIndex((level) => level === current)
  );
  const selectedLevel = levels[selectedIndex] ?? current;
  const showWarn = selectedLevel === 'supervised' && !staticOnly;
  const warn = showWarn ? supervisedWarnForWorker(workerId) : undefined;

  const columns = levels.length <= 1 ? 1 : levels.length === 2 ? 2 : 3;

  const onCardSelect = useCallback(
    (level: WatchAutonomyLevel) => {
      if (!isDisabled && !staticOnly) onChange(level);
    },
    [isDisabled, staticOnly, onChange]
  );

  return (
    <div data-test-subj="alertZeroAutonomyLevelControl">
      {cards.intro ? (
        <EuiText size="s" color="subdued" data-test-subj="alertZeroAutonomyIntro">
          <p>{cards.intro}</p>
        </EuiText>
      ) : null}
      {!staticOnly ? (
        <>
          <div
            css={css`
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              color: ${euiTheme.colors.textSubdued};
              margin: 2px 0 6px;
            `}
          >
            <span>{i18n.AUTONOMY_SCALE_LEFT}</span>
            <span>{i18n.AUTONOMY_SCALE_RIGHT}</span>
          </div>
          <AutonomyTrack
            levels={levels}
            index={selectedIndex}
            isDisabled={isDisabled}
            onChangeIndex={(next) => {
              const level = levels[next];
              if (level) onCardSelect(level);
            }}
          />
        </>
      ) : (
        <EuiText size="s">
          <span>{TICK_LABEL[selectedLevel]}</span>
        </EuiText>
      )}

      <div
        role="radiogroup"
        aria-label={i18n.AUTONOMY_TRACK_ARIA_LABEL}
        css={css`
          display: grid;
          grid-template-columns: ${columns === 1
            ? 'minmax(0, 0.55fr)'
            : `repeat(${columns}, minmax(0, 1fr))`};
          gap: 10px;
          margin-top: ${staticOnly ? euiTheme.size.s : 0};
        `}
      >
        {cards.levels.map((card) => (
          <LevelCardButton
            key={card.level}
            card={card}
            selected={card.level === selectedLevel}
            interactive={!staticOnly && !isDisabled}
            onSelect={() => onCardSelect(card.level)}
          />
        ))}
      </div>

      {showWarn && warn ? (
        <div
          role="status"
          data-test-subj="alertZeroAutonomyWarn"
          css={css`
            display: flex;
            gap: ${euiTheme.size.s};
            align-items: flex-start;
            margin-top: 12px;
            padding: 10px 14px;
            border: 1px solid ${euiTheme.colors.borderBaseWarning};
            border-radius: ${euiTheme.border.radius.medium};
            background: ${euiTheme.colors.backgroundBaseWarning};
          `}
        >
          <EuiIcon
            type="warning"
            color="warning"
            size="s"
            css={css`
              margin-top: 2px;
              flex-shrink: 0;
            `}
            aria-hidden={true}
          />
          <EuiText size="s" color="warning">
            <p
              css={css`
                margin: 0;
              `}
            >
              {warn}
            </p>
          </EuiText>
        </div>
      ) : null}
    </div>
  );
};
