/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { TableId } from '@kbn/securitysolution-data-table';
import {
  AttackDetectedOn,
  useFormattedAttackTimestamp,
} from '../../../../attack_discovery/components/attack_detected_on';
import { AttackEntitySummary } from '../../../../attack_discovery/components/attack_entity_summary';
import { AttackSummarySections } from '../../../../attack_discovery/components/attack_summary_sections';
import type { AttackAttachmentMetadata } from '../../../../../common/cases/attachments/attack';
import {
  ATTACK_ALERT_COUNT_TEST_ID,
  ATTACK_CARD_TEST_ID,
  ATTACK_SUMMARY_TEST_ID,
  ATTACK_TITLE_TEST_ID,
} from '../../../../../common/cases/attachments/attack/test_ids';

export interface AttackChildrenProps {
  /**
   * Metadata saved in the case attachment (attack).
   */
  metadata: AttackAttachmentMetadata;
}

const Separator: FC = () => (
  <EuiFlexItem grow={false}>
    <EuiText color="subdued" size="xs">
      {'|'}
    </EuiText>
  </EuiFlexItem>
);

/**
 * The feed sizes attachments by their widest content, so containment stops the unwrapped entity
 * summary and attack chain from widening the card.
 */
const cardCss = css`
  contain: inline-size;
`;

/**
 * Renders the attack in the case activity log with the Attacks page's components.
 *
 * Never fetches the attack, since the feed mounts every attachment at once and the attack may age
 * into a frozen tier; markdown actions are disabled for the same reason, as each fires a search.
 * Metadata is written once, at attach time, and is never backfilled, so every optional field is guarded.
 */
export const AttackChildren: FC<AttackChildrenProps> = ({ metadata }) => {
  const {
    title,
    summaryMarkdown,
    detailsMarkdown,
    entitySummaryMarkdown,
    mitreAttackTactics,
    timestamp,
    alertCount,
  } = metadata;

  // Drives the separator too, as the Attacks page only shows "Detected on" once it formats.
  const formattedTimestamp = useFormattedAttackTimestamp(timestamp);

  const hasEntitySummary = entitySummaryMarkdown != null && entitySummaryMarkdown.length > 0;
  const hasSummary = summaryMarkdown != null && summaryMarkdown.length > 0;
  const hasDetails = detailsMarkdown != null && detailsMarkdown.length > 0;
  const hasTactics = mitreAttackTactics != null && mitreAttackTactics.length > 0;

  return (
    <EuiFlexGroup
      css={cardCss}
      data-test-subj={ATTACK_CARD_TEST_ID}
      gutterSize="s"
      direction="column"
    >
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h4 data-test-subj={ATTACK_TITLE_TEST_ID}>{title}</h4>
        </EuiTitle>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={false}>
          {formattedTimestamp != null && formattedTimestamp.length > 0 && (
            <EuiFlexItem grow={false}>
              <AttackDetectedOn timestamp={timestamp} />
            </EuiFlexItem>
          )}

          {alertCount != null && (
            <>
              {formattedTimestamp != null && formattedTimestamp.length > 0 && <Separator />}
              <EuiFlexItem grow={false}>
                <EuiText color="subdued" data-test-subj={ATTACK_ALERT_COUNT_TEST_ID} size="xs">
                  <FormattedMessage
                    id="xpack.securitySolution.attackDiscovery.cases.attackAlertCount"
                    defaultMessage="{alertCount, plural, one {# alert} other {# alerts}}"
                    values={{ alertCount }}
                  />
                </EuiText>
              </EuiFlexItem>
            </>
          )}

          {hasEntitySummary && (
            <>
              <Separator />
              <EuiFlexItem
                grow
                css={css`
                  min-width: 0;
                `}
              >
                <AttackEntitySummary
                  disableActions
                  entitySummaryMarkdown={entitySummaryMarkdown}
                  scopeId={TableId.alertsOnCasePage}
                />
              </EuiFlexItem>
            </>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>

      {(hasSummary || hasDetails || hasTactics) && (
        <EuiFlexItem grow={false}>
          <AttackSummarySections
            dataTestSubj={ATTACK_SUMMARY_TEST_ID}
            detailsMarkdown={detailsMarkdown}
            disableActions
            mitreAttackTactics={mitreAttackTactics}
            scopeId={TableId.alertsOnCasePage}
            summaryMarkdown={summaryMarkdown ?? ''}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
