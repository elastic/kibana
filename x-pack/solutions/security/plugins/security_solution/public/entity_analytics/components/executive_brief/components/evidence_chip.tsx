/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { Status, CaseStatuses } from '@kbn/cases-components';
import type { EvidenceId } from '../../../../../common/entity_analytics/executive_brief/types';
import { useIsNewFlyoutEnabled } from '../../../../common/hooks/use_is_new_flyout_enabled';
import { CaseDetailsLink } from '../../../../common/components/links';
import { useFlyoutApi } from '../../../../flyout_v2/use_flyout_api';
import { EntityBadge } from '../../entity_badge';
import { EXECUTIVE_BRIEF_SCOPE_ID } from '../constants';
import { getTacticName } from '../utils/resolve_evidence';
import { useBriefSnapshot } from './brief_context';

const CASE_STATUS: Record<'open' | 'in-progress' | 'closed', CaseStatuses> = {
  open: CaseStatuses.open,
  'in-progress': CaseStatuses['in-progress'],
  closed: CaseStatuses.closed,
};

/** Resolves any evidence id through the snapshot catalog and renders the right chip or link. */
export const EvidenceChip: React.FC<{ id: EvidenceId }> = ({ id }) => {
  const snapshot = useBriefSnapshot();
  const { openRuleFlyout } = useFlyoutApi();
  const isNewFlyoutEnabled = useIsNewFlyoutEnabled();
  const entry = snapshot.catalog[id];

  if (!entry) {
    return <EuiBadge color="hollow">{id}</EuiBadge>;
  }

  switch (entry.kind) {
    case 'entity': {
      const entity = snapshot.entities[entry.euid];
      return (
        <EntityBadge
          entity={{
            type: entity?.type ?? 'generic',
            name: entity?.name ?? entry.euid,
            id: entry.euid,
          }}
          scopeId={EXECUTIVE_BRIEF_SCOPE_ID}
        />
      );
    }
    case 'rule':
      return isNewFlyoutEnabled ? (
        <EuiBadge
          color="hollow"
          iconType="securitySignal"
          onClick={() => openRuleFlyout({ ruleId: entry.ruleId, title: entry.name })}
          onClickAriaLabel={`Open rule ${entry.name}`}
          data-test-subj="executiveBriefRuleChip"
        >
          {entry.name}
        </EuiBadge>
      ) : (
        <EuiBadge color="hollow" iconType="securitySignal">
          {entry.name}
        </EuiBadge>
      );
    case 'attack_discovery':
      return (
        <EuiBadge color="hollow" iconType="bolt">
          {entry.title}
        </EuiBadge>
      );
    case 'lead':
      return (
        <EuiBadge color="hollow" iconType="lightbulb">
          {entry.title}
        </EuiBadge>
      );
    case 'case':
      return (
        <>
          <CaseDetailsLink detailName={entry.caseId} title={entry.title}>
            {entry.title}
          </CaseDetailsLink>{' '}
          <Status status={CASE_STATUS[entry.status]} />
        </>
      );
    case 'tactic':
      return (
        <EuiBadge color="hollow" iconType="crosshairs">
          {getTacticName(snapshot, entry.tacticId)}
        </EuiBadge>
      );
    case 'gap': {
      const gap = snapshot.blindSpots.gaps.find(({ signal }) => signal === entry.signal);
      return (
        <EuiBadge color="hollow" iconType="eyeClosed">
          {gap?.title ?? id}
        </EuiBadge>
      );
    }
    case 'story':
      return (
        <EuiBadge color="hollow" iconType="timeline">
          {`Storyline ${entry.rank}`}
        </EuiBadge>
      );
    default:
      return <EuiBadge color="hollow">{id}</EuiBadge>;
  }
};
