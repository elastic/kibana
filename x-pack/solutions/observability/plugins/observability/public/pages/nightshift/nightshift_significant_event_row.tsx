/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';

import { EuiBadge, EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { addNightshiftAttachment } from './nightshift_attachments';
import type { EventSeverity, SignificantEvent } from './nightshift_critical_events';

export type SignificantEventDisplayStatus = EventSeverity | 'resolved';

/**
 * Visual props for the right-side status badge on a significant-event row.
 */
const EVENT_STATUS_BADGE: Record<
  SignificantEventDisplayStatus,
  { color: 'danger' | 'warning' | 'hollow' | 'success'; label: string }
> = {
  critical: {
    color: 'danger',
    label: i18n.translate('xpack.observability.nightshift.critical.severity.critical', {
      defaultMessage: 'Critical',
    }),
  },
  medium: {
    color: 'warning',
    label: i18n.translate('xpack.observability.nightshift.critical.severity.medium', {
      defaultMessage: 'Medium',
    }),
  },
  low: {
    color: 'hollow',
    label: i18n.translate('xpack.observability.nightshift.critical.severity.low', {
      defaultMessage: 'Low',
    }),
  },
  resolved: {
    color: 'success',
    label: i18n.translate('xpack.observability.nightshift.eventStatus.resolved', {
      defaultMessage: 'Resolved',
    }),
  },
};

export interface SignificantEventRowProps {
  event: SignificantEvent;
  isLast: boolean;
  /** When set, replaces the badge derived from `event.severity`. */
  displayStatus?: SignificantEventDisplayStatus;
  /** Prefix for `data-test-subj` on the row and badge (default: nightshiftCriticalEvent). */
  testSubjPrefix?: string;
}

/** Compact event row with severity (or resolved) badge and right-side action icons. */
export const SignificantEventRow: React.FC<SignificantEventRowProps> = ({
  event,
  isLast,
  displayStatus,
  testSubjPrefix = 'nightshiftCriticalEvent',
}) => {
  const { euiTheme } = useEuiTheme();
  const status = displayStatus ?? event.severity;
  const statusBadge = EVENT_STATUS_BADGE[status];

  return (
    <div
      css={css`
        padding: 12px;
        background: ${euiTheme.colors.backgroundBasePlain};
        border-bottom: ${isLast ? 'none' : euiTheme.border.thin};
      `}
      data-test-subj={`${testSubjPrefix}-${event.id}`}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="expand" size="s" color={euiTheme.colors.textPrimary} />
        </EuiFlexItem>
        <EuiFlexItem
          css={css`
            min-width: 0;
          `}
        >
          <EuiText
            size="xs"
            css={css`
              color: ${euiTheme.colors.textPrimary};
              font-weight: ${euiTheme.font.weight.semiBold};
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            `}
            title={event.title}
          >
            {event.title}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiBadge
                color={statusBadge.color}
                data-test-subj={`${testSubjPrefix}-${event.id}-badge`}
              >
                {statusBadge.label}
              </EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="paperClip"
                color="text"
                size="xs"
                aria-label={i18n.translate(
                  'xpack.observability.nightshift.critical.attachAriaLabel',
                  {
                    defaultMessage: 'Attach "{title}" to the input',
                    values: { title: event.title },
                  }
                )}
                data-test-subj={`${testSubjPrefix}-${event.id}-attach`}
                onClick={() =>
                  addNightshiftAttachment({
                    id: `significantEvent:${event.id}`,
                    label: event.title,
                    iconType: 'alert',
                  })
                }
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="boxesHorizontal"
                color="text"
                size="xs"
                aria-label={i18n.translate(
                  'xpack.observability.nightshift.critical.moreAriaLabel',
                  { defaultMessage: 'More actions' }
                )}
                onClick={() => {}}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
