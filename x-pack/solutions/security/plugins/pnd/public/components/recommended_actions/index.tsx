/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { RecommendedResponseAction, RecommendedResponseActionPriority } from '@kbn/pnd-common';

import * as i18n from './translations';

interface PriorityBadge {
  color: 'danger' | 'hollow' | 'warning';
  label: string;
}

const PRIORITY_BADGES: Record<RecommendedResponseActionPriority, PriorityBadge> = {
  hardening: { color: 'hollow', label: i18n.PRIORITY_HARDENING },
  immediate: { color: 'danger', label: i18n.PRIORITY_IMMEDIATE },
  investigation: { color: 'warning', label: i18n.PRIORITY_INVESTIGATION },
};

/** A priority outside the enum is rendered as written: the parser does not enforce membership. */
const priorityBadge = (priority: RecommendedResponseActionPriority): PriorityBadge =>
  PRIORITY_BADGES[priority] ?? { color: 'hollow', label: priority };

/** Defensive: the parser validates only `action_type` / `execution` / `title`, never `targets`. */
const readStrings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];

/** One line naming what the action would touch, so a recommendation is never read blind. */
const formatTargets = (targets: RecommendedResponseAction['targets']): string => {
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

export interface RecommendedActionsProps {
  /** The recommendations recovered from the gate's reasoning summary. @see parseRecommendedActions */
  actions: RecommendedResponseAction[];
}

/**
 * The containment the Forensic Watch recommended, read-only.
 *
 * Deliberately without per-action controls: nothing in this repo executes a recommended action,
 * so a toggle or a button here would authorize something that cannot happen. The section says
 * out loud that approving the gate executes none of it, because a list of containment actions on
 * an approval card otherwise reads as a list of things about to run.
 *
 * Renders nothing on an empty list — the prose summary already covers a gate with nothing to
 * contain, and an empty panel is worse than no panel.
 */
export const RecommendedActions: React.FC<RecommendedActionsProps> = ({ actions }) => {
  const { euiTheme } = useEuiTheme();

  if (actions.length === 0) {
    return null;
  }

  const sectionStyles = css`
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.xs};
    padding: 0 ${euiTheme.size.m} ${euiTheme.size.m};
  `;

  const headingStyles = css`
    color: ${euiTheme.colors.textHeading};
    font-size: 12px;
    font-weight: ${euiTheme.font.weight.semiBold};
    line-height: 18px;
    text-transform: uppercase;
  `;

  const listStyles = css`
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.s};
    list-style: none;
    margin: ${euiTheme.size.xs} 0 0;
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
    <div css={sectionStyles} data-test-subj="pndRecommendedActions">
      <span css={headingStyles}>{i18n.HEADING}</span>
      <span css={detailStyles} data-test-subj="pndRecommendedActionsNotExecuted">
        {i18n.NOT_EXECUTED}
      </span>

      <ul css={listStyles} data-test-subj="pndRecommendedActionsList">
        {actions.map((action, index) => {
          const priority = priorityBadge(action.priority);

          return (
            <li
              css={rowStyles}
              data-test-subj={`pndRecommendedActionRow-${index}`}
              key={`${action.action_type}-${index}`}
            >
              <div css={rowHeaderStyles}>
                <span css={titleStyles} data-test-subj={`pndRecommendedActionTitle-${index}`}>
                  {action.title}
                </span>
                <EuiBadge color="hollow" data-test-subj={`pndRecommendedActionType-${index}`}>
                  {action.action_type}
                </EuiBadge>
                <EuiBadge
                  color={priority.color}
                  data-test-subj={`pndRecommendedActionPriority-${index}`}
                >
                  {priority.label}
                </EuiBadge>
                {action.execution !== 'kibana_api' ? (
                  <EuiBadge color="default" data-test-subj={`pndRecommendedActionManual-${index}`}>
                    {i18n.MANUAL_BADGE}
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
    </div>
  );
};
