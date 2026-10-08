/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGrid, EuiFlexItem, EuiPanel, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type {
  BriefSnapshot,
  ExecutiveBrief,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { BriefStatTile } from '../components/brief_stat_tile';
import { SectionTitle } from '../components/section_title';
import { EXECUTIVE_BRIEF_SECTION_IDS } from '../constants';

interface AtAGlanceProps {
  snapshot: BriefSnapshot;
  glance: ExecutiveBrief['glance'];
}

export const AtAGlance: React.FC<AtAGlanceProps> = ({ snapshot, glance }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <section id={EXECUTIVE_BRIEF_SECTION_IDS.atAGlance} data-test-subj="executiveBriefAtAGlance">
      <SectionTitle index={1} title="At a glance" subtitle="How are we doing?" />
      <EuiFlexGrid columns={4} gutterSize="m" responsive>
        {snapshot.glance.stats.map((stat) => (
          <EuiFlexItem key={stat.id}>
            <BriefStatTile stat={stat} />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
      <EuiSpacer size="m" />
      <EuiPanel
        hasBorder
        paddingSize="m"
        css={css`
          border-inline-start: ${euiTheme.border.width.thick} solid ${euiTheme.colors.accent};
        `}
        data-test-subj="executiveBriefThreatNarrative"
      >
        <EuiText size="s">
          <p>
            <strong>{glance.headline}</strong>
          </p>
          <p>{glance.threatNarrative}</p>
        </EuiText>
      </EuiPanel>
    </section>
  );
};
