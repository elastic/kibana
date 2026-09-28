/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiCheckableCard,
  EuiIcon,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { WatchAutonomyLevel } from '@kbn/alertzero-common';
import {
  factValueParts,
  getAutonomyLevelCards,
  workerNameForCards,
  supervisedWarnForWorker,
  type AutonomyLevelCard,
  type AutonomyLevelCardsCopy,
  type LevelCardFactPart,
} from './autonomy_level_cards_data';
import * as i18n from '../settings_translations';

interface AutonomyLevelControlProps {
  workerId: string;
  current: WatchAutonomyLevel;
  /**
   * Levels this Worker supports, projected by the server. The control renders only these, so a
   * Worker that narrows its schema narrows the UI with no client-side list to keep in sync.
   * Optional so a Worker fetched before this field existed degrades to "every level offered".
   */
  allowedAutonomyLevels?: readonly WatchAutonomyLevel[];
  isDisabled?: boolean;
  onChange: (level: WatchAutonomyLevel) => void;
}

function ActorPill({ actor }: { actor: 'you' | 'worker' }) {
  return (
    <EuiBadge
      color={actor === 'you' ? 'hollow' : 'primary'}
      data-test-subj={`alertZeroAutonomyActor-${actor}`}
      css={css`
        vertical-align: 1px;
      `}
    >
      {actor === 'you' ? i18n.AUTONOMY_ACTOR_YOU : i18n.AUTONOMY_ACTOR_WORKER}
    </EuiBadge>
  );
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

/**
 * Gap between a fact's label and its value. The label column is `max-content`, not a fixed width,
 * so rows stay aligned while a short label keeps its value beside it.
 */
const FACT_LABEL_GAP_PX = 12;

function LevelCardBody({ card }: { card: AutonomyLevelCard }) {
  const { euiTheme } = useEuiTheme();
  return (
    <div>
      <EuiText size="xs" color="subdued">
        <p
          data-test-subj="alertZeroAutonomyCardWho"
          css={css`
            margin: 0 0 6px;
          `}
        >
          {card.who}
        </p>
      </EuiText>
      {/*
        Label-left / value-right, on the same `SettingRow` grid the rest of the Worker's settings
        use, so a card's facts line up with the rows above and below it instead of stacking.
      */}
      <dl
        css={css`
          display: grid;
          grid-template-columns: max-content minmax(0, 1fr);
          column-gap: ${FACT_LABEL_GAP_PX}px;
          row-gap: 2px;
          align-items: baseline;
          margin: 0;
        `}
      >
        {card.facts.map((fact) => (
          <div
            key={fact.label}
            data-test-subj="alertZeroAutonomyCardFact"
            css={css`
              display: contents;
            `}
          >
            <dt
              css={css`
                margin: 0;
                font-size: inherit;
                font-weight: ${euiTheme.font.weight.semiBold};
              `}
            >
              {fact.label}
            </dt>
            <dd
              css={css`
                margin: 0;
                min-width: 0;
                color: ${euiTheme.colors.textSubdued};
              `}
            >
              <FactParts parts={factValueParts(fact.value)} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * The single level a Worker offers, or null when it offers a choice. The server's projection is
 * consulted before the card copy: the declaration is what decides whether there is a choice, and a
 * Worker the copy map does not know still has one.
 */
const resolveFixedLevel = (
  allowedAutonomyLevels: readonly WatchAutonomyLevel[] | undefined,
  cards: AutonomyLevelCardsCopy | null
): WatchAutonomyLevel | null => {
  if (allowedAutonomyLevels?.length === 1) {
    return allowedAutonomyLevels[0];
  }
  return cards?.levels.length === 1 ? cards.levels[0].level : null;
};

/**
 * Autonomy picker: EuiCheckableCard radios so level meanings stay visible before selection.
 * Selecting the highest level shows the supervised warning callout under the cards.
 */
export const AutonomyLevelControl: React.FC<AutonomyLevelControlProps> = ({
  workerId,
  current,
  allowedAutonomyLevels,
  isDisabled,
  onChange,
}) => {
  const { euiTheme } = useEuiTheme();
  const allCards = getAutonomyLevelCards(workerId);
  const groupName = useGeneratedHtmlId({ prefix: 'alertZeroAutonomyLevel' });
  // Card copy exists for every level; which ones are offered is the server's call.
  const cards = useMemo(() => {
    if (!allCards) return null;
    if (!allowedAutonomyLevels) return allCards;
    const levels = allCards.levels.filter((card) => allowedAutonomyLevels.includes(card.level));
    return levels.length > 0 ? { ...allCards, levels } : null;
  }, [allCards, allowedAutonomyLevels]);

  // One allowed level is a fact about the Worker, not a choice — render it as a fixed value
  // rather than a radio the analyst can click but never change.
  const fixedLevel = resolveFixedLevel(allowedAutonomyLevels, cards);
  if (fixedLevel) {
    const fixedCard = cards?.levels.find(({ level }) => level === fixedLevel) ?? null;
    return (
      <div data-test-subj="alertZeroAutonomyLevelControl">
        <EuiCheckableCard
          id={`${groupName}-${fixedLevel}`}
          name={groupName}
          checkableType="radio"
          label={i18n.autonomyLevelName(fixedLevel)}
          labelProps={{ 'data-test-subj': 'alertZeroAutonomyFixedLevel' }}
          // The only radio in its group, so it is checked and stays checked. React routes a
          // radio's `onChange` off its click event, so clicking an already-checked one still calls
          // the handler — hence the no-op rather than `onChange`, which would patch the Worker
          // with the level it already has. Left enabled rather than disabled so the level reads at
          // full contrast: it is the Worker's actual setting, not one withheld from the analyst.
          checked={true}
          disabled={true}
          onChange={() => {}}
          data-test-subj={`alertZeroAutonomyCard-${fixedLevel}`}
        >
          {/* The same explanation the level carries inside a choice. */}
          {fixedCard ? <LevelCardBody card={fixedCard} /> : null}
        </EuiCheckableCard>
      </div>
    );
  }

  if (!cards) {
    return (
      <EuiText size="s" color="subdued">
        <p data-test-subj="alertZeroAutonomyLevelControl">{i18n.autonomyLevelName(current)}</p>
      </EuiText>
    );
  }

  const levels = cards.levels.map((card) => card.level);
  const selectedLevel = levels.includes(current) ? current : levels[0];
  const isHighest =
    levels.length > 1 &&
    selectedLevel === levels[levels.length - 1] &&
    selectedLevel === 'supervised';
  const warn = isHighest ? supervisedWarnForWorker(workerNameForCards(workerId)) : null;

  return (
    <div data-test-subj="alertZeroAutonomyLevelControl">
      <div
        role="radiogroup"
        aria-label={i18n.AUTONOMY_RADIOGROUP_ARIA_LABEL}
        css={css`
          display: flex;
          flex-direction: column;
          gap: 10px;
        `}
      >
        {cards.levels.map((card) => {
          const id = `${groupName}-${card.level}`;
          return (
            <EuiCheckableCard
              key={card.level}
              id={id}
              name={groupName}
              checkableType="radio"
              label={i18n.autonomyLevelName(card.level)}
              checked={card.level === selectedLevel}
              disabled={isDisabled}
              onChange={() => onChange(card.level)}
              data-test-subj={`alertZeroAutonomyCard-${card.level}`}
            >
              <LevelCardBody card={card} />
            </EuiCheckableCard>
          );
        })}
      </div>
      {warn ? (
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
