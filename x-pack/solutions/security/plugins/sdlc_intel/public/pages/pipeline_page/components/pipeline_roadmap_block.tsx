/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
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
import { computeRoadmapStats } from '../lib/pipeline_filters';
import { PipelineEpicRow } from './pipeline_epic_row';
import { PipelineGridHeader } from './pipeline_grid_header';

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

export const PipelineRoadmapBlock = ({
  roadmap,
  expandedCells,
  onToggleCell,
  forceOpen,
}: {
  roadmap: SdlcRoadmapGroup;
  expandedCells: ReadonlySet<string>;
  onToggleCell: (cellKey: string) => void;
  forceOpen?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const accent = getRoadmapAccent(roadmap.id);
  const stats = useMemo(() => computeRoadmapStats(roadmap.epics), [roadmap.epics]);

  return (
    <EuiAccordion
      id={`pipeline-roadmap-${roadmap.id}`}
      forceState={forceOpen === undefined ? undefined : forceOpen ? 'open' : 'closed'}
      initialIsOpen
      css={css`
        border: ${euiTheme.border.thin};
        border-left: 3px solid ${accent.color};
        border-radius: ${euiTheme.border.radius.medium};
        overflow: hidden;
        margin-bottom: ${euiTheme.size.m};
      `}
      buttonContent={
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <div
              css={css`
                width: 26px;
                height: 26px;
                border-radius: ${euiTheme.border.radius.medium};
                background: ${accent.background};
                color: ${accent.color};
                display: flex;
                align-items: center;
                justify-content: center;
              `}
            >
              <EuiIcon type={accent.icon} size="s" />
            </div>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>{roadmap.title}</strong>
            </EuiText>
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.sdlcIntel.pipeline.roadmap.epicCount"
                defaultMessage="{count, plural, one {# epic} other {# epics}}"
                values={{ count: roadmap.epicCount }}
              />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" responsive={false}>
              {stats.failCount > 0 ? (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="danger">
                    <FormattedMessage
                      id="xpack.sdlcIntel.pipeline.roadmap.blocked"
                      defaultMessage="{count} blocked"
                      values={{ count: stats.failCount }}
                    />
                  </EuiBadge>
                </EuiFlexItem>
              ) : null}
              {stats.warnCount > 0 ? (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="warning">
                    <FormattedMessage
                      id="xpack.sdlcIntel.pipeline.roadmap.atRisk"
                      defaultMessage="{count} at risk"
                      values={{ count: stats.warnCount }}
                    />
                  </EuiBadge>
                </EuiFlexItem>
              ) : null}
              {stats.deliveryCoveragePct !== null ? (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="success">
                    <FormattedMessage
                      id="xpack.sdlcIntel.pipeline.roadmap.delivery"
                      defaultMessage="{pct}% delivery"
                      values={{ pct: stats.deliveryCoveragePct }}
                    />
                  </EuiBadge>
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem grow={false}>
                <EuiBadge>
                  <FormattedMessage
                    id="xpack.sdlcIntel.pipeline.roadmap.phases"
                    defaultMessage="{passed}/{total} phases"
                    values={{ passed: stats.passCount, total: stats.applicableCount }}
                  />
                </EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      <div
        css={css`
          width: 100%;
          overflow-x: auto;
        `}
      >
        <PipelineGridHeader />
        {roadmap.epics.map((epic) => (
          <PipelineEpicRow
            key={epic.id}
            epic={epic}
            expandedCells={expandedCells}
            onToggleCell={onToggleCell}
          />
        ))}
      </div>
    </EuiAccordion>
  );
};
