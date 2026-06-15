/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SdlcRoadmapGroup } from '../../../../common/api/types';
import { CoverageRing } from './coverage_ring';
import { EpicItem } from './epic_item';

const ROADMAP_ACCENTS = [
  { background: '#EEEDFE', color: '#534AB7', icon: 'timeline' as const },
  { background: '#E1F5EE', color: '#0F6E56', icon: 'gitBranch' as const },
  { background: '#FAEEDA', color: '#854F0B', icon: 'bug' as const },
  { background: '#FAECE7', color: '#993C1D', icon: 'launch' as const },
];

const getRoadmapAccent = (roadmapId: string) => {
  const hash = roadmapId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return ROADMAP_ACCENTS[hash % ROADMAP_ACCENTS.length];
};

export const RoadmapCard = ({
  roadmap,
  forceOpen,
  forceEpicsOpen,
  showPlatformSubtitle,
}: {
  roadmap: SdlcRoadmapGroup;
  forceOpen?: boolean;
  forceEpicsOpen?: boolean;
  showPlatformSubtitle?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const accent = getRoadmapAccent(roadmap.id);
  const shouldRenderEpics = forceOpen || isOpen;
  const statusCounts = useMemo(() => {
    return roadmap.epics.reduce(
      (counts, epic) => {
        if (epic.status === 'closed') {
          counts.closed += 1;
        } else if (epic.status === 'in-progress') {
          counts.inProgress += 1;
        } else {
          counts.open += 1;
        }
        return counts;
      },
      { closed: 0, inProgress: 0, open: 0 }
    );
  }, [roadmap.epics]);
  const atRiskCount = roadmap.epics.filter((epic) => epic.coveragePct < 30).length;

  return (
    <EuiAccordion
      id={`roadmap-${roadmap.id}`}
      forceState={forceOpen === undefined ? undefined : forceOpen ? 'open' : 'closed'}
      initialIsOpen={false}
      onToggle={(nextIsOpen) => setIsOpen(nextIsOpen)}
      css={css`
        border: ${euiTheme.border.thin};
        border-radius: ${euiTheme.border.radius.medium};
        background: ${euiTheme.colors.emptyShade};
        overflow: hidden;
      `}
      buttonProps={{
        css: css`
          padding: ${euiTheme.size.m};
          border-left: 3px solid ${accent.color};
        `,
      }}
      buttonContent={
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <div
              css={css`
                width: 36px;
                height: 36px;
                border-radius: ${euiTheme.border.radius.medium};
                background: ${accent.background};
                color: ${accent.color};
                display: flex;
                align-items: center;
                justify-content: center;
              `}
            >
              <EuiIcon type={accent.icon} />
            </div>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>{roadmap.title}</strong>
            </EuiText>
            <EuiText size="xs" color="subdued">
              {showPlatformSubtitle ? (
                <FormattedMessage
                  id="xpack.sdlcIntel.executive.roadmap.platformSubtitle"
                  defaultMessage="Platform / Kibana · {count, plural, one {# item} other {# items}}"
                  values={{ count: roadmap.epicCount }}
                />
              ) : (
                <FormattedMessage
                  id="xpack.sdlcIntel.executive.roadmap.subtitle"
                  defaultMessage="{product} · {count, plural, one {# epic} other {# epics}}"
                  values={{ product: roadmap.product, count: roadmap.epicCount }}
                />
              )}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              {atRiskCount > 0 ? (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="warning" iconType="alert">
                    <FormattedMessage
                      id="xpack.sdlcIntel.executive.roadmap.atRiskCount"
                      defaultMessage="{count} at risk"
                      values={{ count: atRiskCount }}
                    />
                  </EuiBadge>
                </EuiFlexItem>
              ) : null}
              {statusCounts.closed > 0 ? (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="success">
                    <FormattedMessage
                      id="xpack.sdlcIntel.executive.roadmap.doneCount"
                      defaultMessage="{count} done"
                      values={{ count: statusCounts.closed }}
                    />
                  </EuiBadge>
                </EuiFlexItem>
              ) : null}
              {statusCounts.inProgress > 0 ? (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="warning">
                    <FormattedMessage
                      id="xpack.sdlcIntel.executive.roadmap.activeCount"
                      defaultMessage="{count} active"
                      values={{ count: statusCounts.inProgress }}
                    />
                  </EuiBadge>
                </EuiFlexItem>
              ) : null}
              {statusCounts.open > 0 ? (
                <EuiFlexItem grow={false}>
                  <EuiBadge>
                    <FormattedMessage
                      id="xpack.sdlcIntel.executive.roadmap.plannedCount"
                      defaultMessage="{count} planned"
                      values={{ count: statusCounts.open }}
                    />
                  </EuiBadge>
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem grow={false}>
                <CoverageRing coveragePct={roadmap.coveragePct} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      <div
        css={css`
          padding: 0 ${euiTheme.size.m} ${euiTheme.size.m};
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.s};
        `}
      >
        {shouldRenderEpics
          ? roadmap.epics.map((epic) => (
              <EpicItem key={epic.id} epic={epic} forceOpen={forceEpicsOpen} />
            ))
          : (
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.sdlcIntel.executive.roadmap.expandToLoad"
                defaultMessage="Expand to load {count, plural, one {# epic} other {# epics}}"
                values={{ count: roadmap.epicCount }}
              />
            </EuiText>
          )}
      </div>
    </EuiAccordion>
  );
};
