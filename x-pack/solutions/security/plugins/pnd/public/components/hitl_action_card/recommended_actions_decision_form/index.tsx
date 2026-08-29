/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiCallOut, EuiSwitch, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type {
  AttackDiscoveryRecommendedAction,
  AttackDiscoveryRecommendedActionPriority,
} from '@kbn/pnd-common';

import { FixedDecisionForm } from '../fixed_decision_form';
import { FIXED_DECISION_NAME } from '../helpers/validate_fixed_decision_values';
import * as i18n from './translations';

/**
 * The extra `_respond` input key this form owns, next to the fixed
 * `decision` / `rationale` pair: the FULL staged action objects whose toggles
 * are on, echoed back so the workflow executes exactly what the analyst saw.
 */
export const APPROVED_ACTIONS_NAME = 'approved_actions';

/**
 * The one staged action whose execution is analysis rather than a state
 * change: approving it runs a scoped, read-only agent hunt whose findings are
 * appended to the incident conversation. The row says so out loud, because a
 * toggle that reads like a response action would overstate what it authorizes.
 */
const AGENT_HUNT_ACTION_TYPE = 'analyze_exfiltration_ips';

interface PriorityBadge {
  color: 'danger' | 'hollow' | 'warning';
  label: string;
}

const PRIORITY_BADGES: Record<AttackDiscoveryRecommendedActionPriority, PriorityBadge> = {
  hardening: { color: 'hollow', label: i18n.PRIORITY_HARDENING },
  immediate: { color: 'danger', label: i18n.PRIORITY_IMMEDIATE },
  investigation: { color: 'warning', label: i18n.PRIORITY_INVESTIGATION },
};

/** A priority outside the enum is rendered as written: the parser does not enforce membership. */
const priorityBadge = (priority: AttackDiscoveryRecommendedActionPriority): PriorityBadge =>
  PRIORITY_BADGES[priority] ?? { color: 'hollow', label: priority };

/** Defensive: the parser validates only `action_type` / `execution` / `title`, never `targets`. */
const readStrings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];

/** One line naming what the action touches, so a toggle is never flipped blind. */
const formatTargets = (targets: AttackDiscoveryRecommendedAction['targets']): string => {
  const hosts = readStrings(targets?.hosts);
  const users = readStrings(targets?.users);
  const ips = readStrings(targets?.ips);
  const alertIds = readStrings(targets?.alert_ids);

  const parts = [
    ...(hosts.length > 0 ? [i18n.targetHosts(hosts.join(', '))] : []),
    ...(users.length > 0 ? [i18n.targetUsers(users.join(', '))] : []),
    ...(ips.length > 0 ? [i18n.targetIps(ips.join(', '))] : []),
    ...(alertIds.length > 0 ? [i18n.targetAlerts(alertIds.length)] : []),
  ];

  return parts.length > 0 ? parts.join(' · ') : i18n.TARGETS_NONE;
};

export interface RecommendedActionsDecisionFormProps {
  /** The staged actions recovered from the gate's reasoning summary. @see parseRecommendedActions */
  actions: AttackDiscoveryRecommendedAction[];
  disabled?: boolean;
  /** Validation messages keyed by field name. @see validateFixedDecisionValues */
  errors?: Record<string, string | undefined>;
  /** Reports the whole answer set, so the caller owns the values. */
  onChange: (values: Record<string, unknown>) => void;
  values: Record<string, unknown>;
}

/**
 * The `incident_contained` gate's answer: one toggle per staged containment
 * action, over the fixed decision controls.
 *
 * Three things about it are load-bearing:
 *
 * **Every toggle starts off, and only an `execution: 'kibana_api'` action gets
 * one.** Approving executes exactly the actions the analyst switched on —
 * nothing executes without an explicit toggle — and a manual action is listed
 * read-only, because the workflow never executes it no matter what is sent.
 *
 * **A dismissal carries no approved actions.** Choosing `dismiss` empties
 * `approved_actions` on the way through and disables every toggle, so the two
 * locks agree: the payload cannot name an action, and the UI cannot re-add one.
 *
 * **It composes `FixedDecisionForm` rather than redrawing it**, so `decision`
 * and `rationale` keep the exact field names, validation and reporting the
 * card's other branches use — submission does not know which branch it drew.
 */
export const RecommendedActionsDecisionForm: React.FC<RecommendedActionsDecisionFormProps> = ({
  actions,
  disabled = false,
  errors,
  onChange,
  values,
}) => {
  const { euiTheme } = useEuiTheme();

  const isDismissing = values[FIXED_DECISION_NAME] === 'dismiss';

  const approved: unknown[] = Array.isArray(values[APPROVED_ACTIONS_NAME])
    ? (values[APPROVED_ACTIONS_NAME] as unknown[])
    : [];

  const toggleAction = (action: AttackDiscoveryRecommendedAction, on: boolean) => {
    // Rebuilt in staged order rather than appended, so the payload always
    // reads in the order the analyst reviewed the list.
    const next = actions.filter((candidate) =>
      candidate === action ? on : approved.includes(candidate)
    );

    onChange({ ...values, [APPROVED_ACTIONS_NAME]: next });
  };

  // `FixedDecisionForm` reports the whole value map, `approved_actions`
  // included; a dismissal empties the toggles on the way through, so a
  // dismissed gate can never carry an approved action.
  const reportDecisionFields = (next: Record<string, unknown>) => {
    onChange(
      next[FIXED_DECISION_NAME] === 'dismiss' ? { ...next, [APPROVED_ACTIONS_NAME]: [] } : next
    );
  };

  const formStyles = css`
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.base};
  `;

  const listStyles = css`
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.s};
    list-style: none;
    margin: 0;
    padding: 0;
  `;

  const rowStyles = css`
    border: 1px solid ${euiTheme.border.color};
    border-radius: ${euiTheme.border.radius.medium};
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.xs};
    padding: ${euiTheme.size.m};
  `;

  const rowHeaderStyles = css`
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: ${euiTheme.size.s};
  `;

  const titleStyles = css`
    color: ${euiTheme.colors.textHeading};
    font-size: 13px;
    font-weight: ${euiTheme.font.weight.semiBold};
    line-height: 20px;
  `;

  const detailStyles = css`
    color: ${euiTheme.colors.textSubdued};
    font-size: 12px;
    line-height: 18px;
  `;

  return (
    <div css={formStyles} data-test-subj="pndRecommendedActionsDecisionForm">
      {actions.length === 0 ? (
        <EuiCallOut
          announceOnMount
          data-test-subj="pndRecommendedActionsEmpty"
          iconType="info"
          size="s"
          text={<p>{i18n.NOTHING_STAGED_BODY}</p>}
          title={i18n.NOTHING_STAGED_TITLE}
        />
      ) : (
        <ul css={listStyles} data-test-subj="pndRecommendedActionsList">
          {actions.map((action, index) => {
            const isKibanaExecutable = action.execution === 'kibana_api';
            const priority = priorityBadge(action.priority);

            return (
              <li
                css={rowStyles}
                data-test-subj={`pndRecommendedActionRow-${index}`}
                key={`${action.action_type}-${index}`}
              >
                <div css={rowHeaderStyles}>
                  {isKibanaExecutable ? (
                    <EuiSwitch
                      checked={approved.includes(action)}
                      compressed
                      data-test-subj={`pndRecommendedActionToggle-${index}`}
                      disabled={disabled || isDismissing}
                      label={<span css={titleStyles}>{action.title}</span>}
                      onChange={(event) => toggleAction(action, event.target.checked)}
                    />
                  ) : (
                    <span css={titleStyles} data-test-subj={`pndRecommendedActionTitle-${index}`}>
                      {action.title}
                    </span>
                  )}
                  <EuiBadge color="hollow" data-test-subj={`pndRecommendedActionType-${index}`}>
                    {action.action_type}
                  </EuiBadge>
                  <EuiBadge
                    color={priority.color}
                    data-test-subj={`pndRecommendedActionPriority-${index}`}
                  >
                    {priority.label}
                  </EuiBadge>
                  {!isKibanaExecutable ? (
                    <EuiBadge
                      color="default"
                      data-test-subj={`pndRecommendedActionManual-${index}`}
                    >
                      {i18n.MANUAL_BADGE}
                    </EuiBadge>
                  ) : null}
                  {action.action_type === AGENT_HUNT_ACTION_TYPE ? (
                    <EuiBadge
                      color="hollow"
                      data-test-subj={`pndRecommendedActionAgentHunt-${index}`}
                    >
                      {i18n.AGENT_HUNT_BADGE}
                    </EuiBadge>
                  ) : null}
                </div>
                <span css={detailStyles} data-test-subj={`pndRecommendedActionTargets-${index}`}>
                  {formatTargets(action.targets)}
                </span>
                <span css={detailStyles} data-test-subj={`pndRecommendedActionRationale-${index}`}>
                  {action.rationale}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <FixedDecisionForm
        disabled={disabled}
        errors={errors}
        onChange={reportDecisionFields}
        values={values}
      />
    </div>
  );
};
