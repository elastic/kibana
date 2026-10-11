/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiIcon, EuiLink, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type {
  BriefEntity,
  BriefSnapshot,
  Storyline,
} from '../../../../../../common/entity_analytics/executive_brief/types';
import { useOpenEntityFlyout } from '../../../entity_badge';
import { EXECUTIVE_BRIEF_SCOPE_ID } from '../../constants';
import { useIsPrintMode } from '../brief_context';
import { EntityExposureFacts } from '../exposure_column';
import type { DiagramNode, DiagramPair } from '../../utils/build_storyline_graph_layout';
import {
  buildStorylineGraphLayout,
  DIAGRAM_CARD_HEIGHT,
} from '../../utils/build_storyline_graph_layout';

export const ICON_BY_ENTITY_TYPE: Record<BriefEntity['type'], string> = {
  user: 'user',
  host: 'storage',
  service: 'vectorTriangle',
  generic: 'globe',
};

/** Share of the width taken by each column; the connector gap is what remains. */
const COLUMN_PERCENT = 36;
const LEFT_EDGE = `${COLUMN_PERCENT}%`;
const RIGHT_EDGE = `${100 - COLUMN_PERCENT}%`;

const EntityCard: React.FC<{ node: DiagramNode; top: number; side: 'left' | 'right' }> = ({
  node,
  top,
  side,
}) => {
  const { euiTheme } = useEuiTheme();
  const isPrintMode = useIsPrintMode();
  const { canOpen, open } = useOpenEntityFlyout(EXECUTIVE_BRIEF_SCOPE_ID);
  const { entity, isHub } = node;
  const name = entity?.name ?? node.euid;
  const openable = entity ? { type: entity.type, name: entity.name, id: entity.euid } : undefined;
  return (
    <div
      data-test-subj={`executiveBriefDiagramNode-${entity?.name ?? node.euid}`}
      css={css`
        position: absolute;
        top: ${top}px;
        ${side}: 0;
        width: ${COLUMN_PERCENT}%;
        height: ${DIAGRAM_CARD_HEIGHT}px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: ${euiTheme.size.xs};
        min-width: 220px;
        padding: ${euiTheme.size.s} ${euiTheme.size.m};
        overflow: hidden;
        border-radius: ${euiTheme.border.radius.medium};
        border: ${euiTheme.border.width.thin} ${isHub ? 'dashed' : 'solid'}
          ${euiTheme.colors.mediumShade};
        background-color: ${isHub
          ? euiTheme.colors.backgroundBaseSubdued
          : euiTheme.colors.backgroundBasePlain};
      `}
    >
      <div
        css={css`
          display: flex;
          align-items: center;
          gap: ${euiTheme.size.xs};
          min-width: 0;
        `}
      >
        <EuiIcon type={ICON_BY_ENTITY_TYPE[entity?.type ?? 'generic']} size="m" aria-hidden />
        <EuiText
          size="s"
          css={css`
            font-weight: ${euiTheme.font.weight.semiBold};
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          `}
        >
          {openable && !isPrintMode && canOpen(openable) ? (
            <EuiLink
              color="text"
              onClick={() => open(openable)}
              aria-label={`Open ${name} details`}
              data-test-subj={`executiveBriefDiagramEntityLink-${name}`}
            >
              {name}
            </EuiLink>
          ) : (
            name
          )}
        </EuiText>
      </div>
      {entity && <EntityExposureFacts entity={entity} />}
      {isHub && (
        <EuiText size="xs" color="subdued">
          {'Shared infrastructure'}
        </EuiText>
      )}
    </div>
  );
};

/** Static two-column relationship diagram. Plain inline SVG with explicit attributes so it prints. */
export const StorylineDiagram: React.FC<{ storyline: Storyline; snapshot: BriefSnapshot }> = ({
  storyline,
  snapshot,
}) => {
  const { euiTheme } = useEuiTheme();
  const layout = useMemo(
    () => buildStorylineGraphLayout(storyline, snapshot),
    [storyline, snapshot]
  );
  const byId = new Map(layout.nodes.map((node) => [node.euid, node]));
  const strongStroke = euiTheme.colors.darkShade;
  const weakStroke = euiTheme.colors.mediumShade;

  const crossPairs = layout.pairs.filter((pair) => !pair.sameColumn);
  const sidePairs = layout.pairs.filter((pair) => pair.sameColumn);

  const renderLine = (pair: DiagramPair, key: string) => {
    const from = byId.get(pair.from);
    const to = byId.get(pair.to);
    if (!from || !to) return null;
    const [left, right] = from.column === 'left' ? [from, to] : [to, from];
    return (
      <line
        key={key}
        x1={LEFT_EDGE}
        y1={left.cy}
        x2={RIGHT_EDGE}
        y2={right.cy}
        stroke={pair.weak ? weakStroke : strongStroke}
        strokeWidth={pair.weak ? 1.5 : 2}
        strokeDasharray={pair.weak ? '5 4' : undefined}
        strokeLinecap="round"
      />
    );
  };

  return (
    <div data-test-subj="executiveBriefDiagram">
      <div
        css={css`
          position: relative;
          height: ${layout.height}px;
          min-height: ${layout.height}px;
        `}
      >
        <svg
          width="100%"
          height={layout.height}
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          css={css`
            position: absolute;
            inset: 0;
          `}
        >
          {crossPairs.map((pair) => renderLine(pair, `${pair.from}|${pair.to}`))}
        </svg>
        {layout.nodes.map((node) => (
          <EntityCard
            key={node.euid}
            node={node}
            side={node.column}
            top={node.cy - DIAGRAM_CARD_HEIGHT / 2}
          />
        ))}
        {crossPairs.map((pair) => (
          <div
            key={`label-${pair.from}|${pair.to}`}
            css={css`
              position: absolute;
              left: ${COLUMN_PERCENT + pair.labelT * (100 - 2 * COLUMN_PERCENT)}%;
              top: ${pair.labelY}px;
              transform: translate(-50%, -50%);
              max-width: ${100 - 2 * COLUMN_PERCENT - 2}%;
            `}
          >
            <EuiToolTip content={pair.verbs.join(' · ')} position="top">
              <div
                tabIndex={0}
                data-test-subj="executiveBriefDiagramLabel"
                css={css`
                  text-align: center;
                  padding: 0 ${euiTheme.size.xs};
                  border-radius: ${euiTheme.border.radius.small};
                  border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.lightShade};
                  background-color: ${euiTheme.colors.backgroundBasePlain};
                `}
              >
                <EuiText size="xs">{pair.label}</EuiText>
              </div>
            </EuiToolTip>
          </div>
        ))}
      </div>
      {sidePairs.length > 0 && (
        <EuiText size="xs" color="subdued" data-test-subj="executiveBriefDiagramSidePairs">
          {sidePairs
            .map(
              (pair) =>
                `${byId.get(pair.from)?.entity?.name ?? pair.from} and ${
                  byId.get(pair.to)?.entity?.name ?? pair.to
                }: ${pair.label}`
            )
            .join('; ')}
        </EuiText>
      )}
    </div>
  );
};
