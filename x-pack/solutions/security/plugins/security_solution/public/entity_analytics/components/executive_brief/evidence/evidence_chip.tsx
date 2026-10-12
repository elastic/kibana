/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { CaseStatuses, Status } from '@kbn/cases-components';
import type {
  Evidence,
  Fact,
  Link,
} from '../../../../../common/entity_analytics/executive_brief/evidence';
import { LINK_VERBS } from '../../../../../common/entity_analytics/executive_brief/evidence';
import { CaseDetailsLink } from '../../../../common/components/links';
import { useIsNewFlyoutEnabled } from '../../../../common/hooks/use_is_new_flyout_enabled';
import { useFlyoutApi } from '../../../../flyout_v2/use_flyout_api';
import { useBriefActions } from '../actions/brief_actions_context';
import { EntityChip } from './entity_chip';
import { getEntity, getFact, getLink, isEntityId, isFactId, isLinkId } from './resolve';

const OPEN_RULE_LABEL = (name: string): string => `Open rule ${name}`;

const CASE_STATUS: Record<string, CaseStatuses> = {
  open: CaseStatuses.open,
  'in-progress': CaseStatuses['in-progress'],
  closed: CaseStatuses.closed,
};

const RuleChip: React.FC<{ fact: Fact; ruleId: string }> = ({ fact, ruleId }) => {
  const isNewFlyoutEnabled = useIsNewFlyoutEnabled();
  const { openRuleFlyout } = useFlyoutApi();

  if (!isNewFlyoutEnabled) {
    return (
      <EuiBadge color="hollow" iconType="securitySignalDetected">
        {fact.title}
      </EuiBadge>
    );
  }

  return (
    <EuiBadge
      color="hollow"
      iconType="securitySignalDetected"
      onClick={() => openRuleFlyout({ ruleId, title: fact.title })}
      onClickAriaLabel={OPEN_RULE_LABEL(fact.title)}
      data-test-subj="executiveBriefRuleChip"
    >
      {fact.title}
    </EuiBadge>
  );
};

const FactChip: React.FC<{ fact: Fact }> = ({ fact }) => {
  const actions = useBriefActions();
  const { source } = fact;

  if (source?.type === 'case') {
    const status = fact.details?.status ? CASE_STATUS[fact.details.status] : undefined;
    return (
      <span data-test-subj="executiveBriefCaseChip">
        {actions ? (
          <CaseDetailsLink detailName={source.id} title={fact.title}>
            {fact.title}
          </CaseDetailsLink>
        ) : (
          fact.title
        )}
        {status && (
          <>
            {' '}
            <Status status={status} />
          </>
        )}
      </span>
    );
  }

  if (source?.type === 'rule' && actions) {
    return <RuleChip fact={fact} ruleId={source.id} />;
  }

  switch (source?.type ?? fact.kind) {
    case 'rule':
      return (
        <EuiBadge color="hollow" iconType="securitySignalDetected">
          {fact.title}
        </EuiBadge>
      );
    case 'attack_discovery':
      return (
        <EuiBadge color="hollow" iconType="bolt" data-test-subj="executiveBriefAttackChip">
          {fact.title}
        </EuiBadge>
      );
    case 'lead':
      return (
        <EuiBadge color="hollow" iconType="bulb" data-test-subj="executiveBriefLeadChip">
          {fact.title}
        </EuiBadge>
      );
    case 'case':
      return (
        <EuiBadge color="hollow" iconType="casesApp">
          {fact.title}
        </EuiBadge>
      );
    default:
      return <EuiBadge color="hollow">{fact.title}</EuiBadge>;
  }
};

const LinkChip: React.FC<{ link: Link; evidence: Evidence }> = ({ link, evidence }) => {
  const from = getEntity(evidence, link.from);
  const to = getEntity(evidence, link.to);
  if (!from || !to) return null;
  return (
    <EuiBadge color="hollow" iconType="link" data-test-subj="executiveBriefLinkChip">
      {`${from.name} ${LINK_VERBS[link.type]} ${to.name}`}
    </EuiBadge>
  );
};

interface EvidenceChipProps {
  /** Any evidence id: ENT-n, F-n or L-n. */
  id: string;
  evidence: Evidence;
}

/** Resolves an evidence id to the right chip; renders nothing for an unknown id. */
export const EvidenceChip: React.FC<EvidenceChipProps> = ({ id, evidence }) => {
  if (isEntityId(id)) return <EntityChip id={id} evidence={evidence} />;

  if (isFactId(id)) {
    const fact = getFact(evidence, id);
    return fact ? <FactChip fact={fact} /> : null;
  }

  if (isLinkId(id)) {
    const link = getLink(evidence, id);
    return link ? <LinkChip link={link} evidence={evidence} /> : null;
  }

  return null;
};

/** The chip for a fact the caller already resolved. */
export const FactEvidenceChip: React.FC<{ fact: Fact }> = ({ fact }) => <FactChip fact={fact} />;
