/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import type {
  BriefEntity,
  Evidence,
} from '../../../../../common/entity_analytics/executive_brief/evidence';
import { EntityBadge } from '../../entity_badge';
import { getEntityIcon } from '../../threat_hunting/top_threat_hunting_leads/utils';
import { useBriefActions } from '../actions/brief_actions_context';
import { EXECUTIVE_BRIEF_SCOPE_ID } from '../constants';
import { getEntity } from './resolve';

interface EntityChipProps {
  /** An ENT id. */
  id: string;
  evidence: Evidence;
}

/** Opens the entity through the injected `openEntity` action; a plain badge when there is none. */
const BriefEntityChip: React.FC<{ entity: BriefEntity }> = ({ entity }) => {
  const actions = useBriefActions();

  if (!actions) {
    return (
      <EuiBadge
        color="hollow"
        iconType={getEntityIcon(entity.type)}
        data-test-subj={`executiveBriefEntityChip-${entity.name}`}
      >
        {entity.name}
      </EuiBadge>
    );
  }

  return (
    <EntityBadge
      entity={{ type: entity.type, name: entity.name, id: entity.euid }}
      scopeId={EXECUTIVE_BRIEF_SCOPE_ID}
      onOpen={() => actions.openEntity(entity)}
    />
  );
};

/** A chip for an entity the brief cites; renders nothing for an unknown id. */
export const EntityChip: React.FC<EntityChipProps> = ({ id, evidence }) => {
  const entity = getEntity(evidence, id);
  return entity ? <BriefEntityChip entity={entity} /> : null;
};
