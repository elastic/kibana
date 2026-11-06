/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiStepsHorizontal,
  EuiText,
  EuiTitle,
  type EuiStepsHorizontalProps,
} from '@elastic/eui';

type EuiStepHorizontalProps = EuiStepsHorizontalProps['steps'][number];
import { SEVERITY_COLOR } from '../../../common/utils/risk_color_palette';
import { DiscussionNote } from './discussion_notes';
import { formatContribution, formatDuration, isAlertLike } from './lens';
import type { EntityTimelineEvent, EntityTimelineLens } from './types';

/** Kill-chain stages shown for an attack; ones without alerts render as not observed. */
const ATTACK_STAGES = [
  'Initial access',
  'Privilege escalation',
  'Credential access',
  'Persistence',
  'Exfiltration',
];

const ENTITY_ICONS = { user: 'user', host: 'desktop', service: 'gear' } as const;

interface AttackZoomHeaderProps {
  attack: EntityTimelineEvent;
  attackEvents: EntityTimelineEvent[];
  entityName: string;
  lens: EntityTimelineLens;
  selectedTactic: string | null;
  onSelectTactic: (tactic: string | null) => void;
  onExit: () => void;
}

export const AttackZoomHeader: React.FC<AttackZoomHeaderProps> = ({
  attack,
  attackEvents,
  entityName,
  lens,
  selectedTactic,
  onSelectTactic,
  onExit,
}) => {
  const caseId = attackEvents.find((event) => event.kind === 'case')?.caseId;

  const { alertCount, riskAdded } = useMemo(() => {
    const alerts = attackEvents.filter(isAlertLike);
    return {
      alertCount: alerts.reduce(
        (total, event) => total + (event.kind === 'alert_burst' ? event.alertCount ?? 1 : 1),
        0
      ),
      riskAdded: alerts.reduce((total, event) => total + (event.contribution ?? 0), 0),
    };
  }, [attackEvents]);

  const steps = useMemo<EuiStepHorizontalProps[]>(() => {
    const observed = new Set(attack.tactics ?? []);
    return ATTACK_STAGES.map((tactic) => {
      const isObserved = observed.has(tactic);
      const status: EuiStepHorizontalProps['status'] = !isObserved
        ? 'disabled'
        : selectedTactic === tactic
        ? 'current'
        : selectedTactic
        ? 'incomplete'
        : 'complete';
      return {
        title: tactic,
        status,
        onClick: () => {
          if (isObserved) onSelectTactic(selectedTactic === tactic ? null : tactic);
        },
        'data-test-subj': `entityTimelineAttackStage-${tactic}`,
      };
    });
  }, [attack.tactics, onSelectTactic, selectedTactic]);

  return (
    <>
      <EuiButtonEmpty
        size="xs"
        flush="left"
        iconType="chevronSingleLeft"
        onClick={onExit}
        data-test-subj="entityTimelineExitAttack"
      >
        {lens === 'risk' ? 'Back to all risk contributions' : 'Back to full timeline'}
      </EuiButtonEmpty>
      <EuiSpacer size="s" />
      <EuiPanel color="subdued" paddingSize="m" data-test-subj="entityTimelineAttackHeader">
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiIcon type="securitySignalDetected" size="l" color="danger" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs" color="subdued">
              Attack discovery
            </EuiText>
            <EuiTitle size="xs">
              <h3>{attack.title}</h3>
            </EuiTitle>
          </EuiFlexItem>
          {attack.severity && (
            <EuiFlexItem grow={false}>
              <EuiBadge color={SEVERITY_COLOR[attack.severity]}>
                {`${attack.attackRiskScore} · Critical`}
              </EuiBadge>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <DiscussionNote id="attackZoom" />
          </EuiFlexItem>
        </EuiFlexGroup>

        {attack.description && (
          <>
            <EuiSpacer size="s" />
            <EuiText size="xs">{attack.description}</EuiText>
          </>
        )}

        <EuiSpacer size="m" />
        <EuiStepsHorizontal size="s" steps={steps} />
        <EuiText size="xs" color="subdued" textAlign="center">
          Select a stage to filter. Grey stages were not observed for this entity.
        </EuiText>

        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="m" responsive={false} wrap>
          <EuiFlexItem>
            <EuiStat
              title={String(alertCount)}
              description="Alerts on this entity"
              titleSize="xxs"
              reverse
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiStat
              title={formatContribution(riskAdded)}
              description="Added to risk score"
              titleSize="xxs"
              titleColor="danger"
              reverse
            />
          </EuiFlexItem>
          {attack.attackStart && attack.attackEnd && (
            <EuiFlexItem>
              <EuiStat
                title={formatDuration(attack.attackStart, attack.attackEnd)}
                description="Attack duration"
                titleSize="xxs"
                reverse
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        {attack.relatedEntities && (
          <>
            <EuiSpacer size="m" />
            <EuiText size="xs" color="subdued">
              Entities in this attack
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
              {attack.relatedEntities.map((entity) => (
                <EuiFlexItem key={entity.name} grow={false}>
                  <EuiBadge
                    color={entity.name === entityName ? 'primary' : 'hollow'}
                    iconType={ENTITY_ICONS[entity.type]}
                  >
                    {entity.name === entityName ? `${entity.name} (this entity)` : entity.name}
                  </EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </>
        )}

        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="xs" flush="left" iconType="external" iconSide="right">
              Open in Attack discovery
            </EuiButtonEmpty>
          </EuiFlexItem>
          {caseId && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="xs" iconType="casesApp">
                {caseId}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );
};
