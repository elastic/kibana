/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiAccordion, EuiBasicTable, EuiSpacer, EuiText } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type {
  BriefEntity,
  BriefSnapshot,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { EntityBadge } from '../../entity_badge';
import { RiskScoreLevel } from '../../severity/common';
import { useIsPrintMode } from '../components/brief_context';
import {
  BRIEF_BLOCK_ATTRIBUTE,
  EXECUTIVE_BRIEF_SCOPE_ID,
  EXECUTIVE_BRIEF_SECTION_IDS,
} from '../constants';

const noop = (): void => {};

/** Collapsed exposure leaders and risk concentration. */
export const Details: React.FC<{ snapshot: BriefSnapshot }> = ({ snapshot }) => {
  const isPrintMode = useIsPrintMode();
  const leaders = snapshot.glance.exposureLeaders
    .map((euid) => snapshot.entities[euid])
    .filter((entity): entity is BriefEntity => entity !== undefined);

  const columns: Array<EuiBasicTableColumn<BriefEntity>> = [
    {
      field: 'name',
      name: 'Entity',
      render: (_name: string, entity: BriefEntity) => (
        <EntityBadge
          entity={{ type: entity.type, name: entity.name, id: entity.euid }}
          scopeId={EXECUTIVE_BRIEF_SCOPE_ID}
        />
      ),
    },
    { field: 'type', name: 'Type' },
    {
      field: 'riskLevel',
      name: 'Risk',
      render: (riskLevel: BriefEntity['riskLevel']) =>
        riskLevel ? <RiskScoreLevel severity={riskLevel} /> : '-',
    },
    {
      field: 'riskScoreNorm',
      name: 'Score',
      render: (score: number | undefined) => (score !== undefined ? Math.round(score) : '-'),
    },
  ];

  return (
    <section
      id={EXECUTIVE_BRIEF_SECTION_IDS.details}
      data-test-subj="executiveBriefDetails"
      {...{ [BRIEF_BLOCK_ATTRIBUTE]: 'details' }}
    >
      <EuiAccordion
        id="executiveBriefDetailsAccordion"
        buttonContent="Details: exposure leaders"
        paddingSize="m"
        arrowDisplay={isPrintMode ? 'none' : 'left'}
        forceState={isPrintMode ? 'open' : undefined}
        onToggle={isPrintMode ? noop : undefined}
      >
        <EuiBasicTable<BriefEntity>
          tableCaption="Exposure leaders"
          items={leaders}
          columns={columns}
        />
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued">
          {snapshot.glance.concentration
            .map(({ type, level, count }) => `${count} ${type} ${level}`)
            .join(' · ')}
        </EuiText>
      </EuiAccordion>
    </section>
  );
};
