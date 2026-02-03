/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSpacer, EuiTitle } from '@elastic/eui';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { replaceAnonymizedValuesWithOriginalValues } from '@kbn/elastic-assistant-common';
import { TableId } from '@kbn/securitysolution-data-table';

import { InvestigateInTimelineButton } from '../../../../../common/components/event_details/investigate_in_timeline_button';
import { getTacticMetadata } from '../../../../../attack_discovery/helpers';
import { AttackChain } from '../../../../../attack_discovery/pages/results/attack_discovery_panel/tabs/attack_discovery_tab/attack/attack_chain';
import { AttackDiscoveryMarkdownFormatter } from '../../../../../attack_discovery/pages/results/attack_discovery_markdown_formatter';
import { buildAlertsKqlFilter } from '../../../alerts_table/actions';

import * as i18n from './translations';

export const SUMMARY_TAB_TEST_ID = 'attackSummaryTab';
export const SUMMARY_CONTENT_TEST_ID = 'summaryContent';
export const DETAILS_TITLE_TEST_ID = 'detailsTitle';
export const DETAILS_CONTENT_TEST_ID = 'detailsContent';
export const ATTACK_CHAIN_TITLE_TEST_ID = 'attackChainTitle';
export const INVESTIGATE_IN_TIMELINE_BUTTON_TEST_ID = 'investigateInTimelineButton';
export const TIMELINE_ICON_TEST_ID = 'timelineIcon';
export const INVESTIGATE_IN_TIMELINE_LABEL_TEST_ID = 'investigateInTimelineLabel';

interface SummaryTabProps {
  /** The attack discovery alert document. If undefined, only the Alerts tab will be shown. */
  attack: AttackDiscoveryAlert;
  /** Whether to show anonymized values instead of replacements */
  showAnonymized?: boolean;
}

/**
 * Component that displays the summary tab content, rendering markdown summaries, details,
 * and optionally the attack chain visualization.
 */
export const SummaryTab = React.memo<SummaryTabProps>(({ attack, showAnonymized = false }) => {
  const { detailsMarkdown, summaryMarkdown } = useMemo(() => attack, [attack]);

  const summaryMarkdownWithReplacements = useMemo(
    () =>
      replaceAnonymizedValuesWithOriginalValues({
        messageContent: summaryMarkdown,
        replacements: attack.replacements,
      }),
    [attack.replacements, summaryMarkdown]
  );

  const detailsMarkdownWithReplacements = useMemo(
    () =>
      replaceAnonymizedValuesWithOriginalValues({
        messageContent: detailsMarkdown,
        replacements: attack.replacements,
      }),
    [attack.replacements, detailsMarkdown]
  );

  const tacticMetadata = useMemo(() => getTacticMetadata(attack), [attack]);

  const originalAlertIds = useMemo(
    () => attack.alertIds.map((id) => attack.replacements?.[id] ?? id),
    [attack.alertIds, attack.replacements]
  );

  const investigateInTimelineFilters = useMemo(
    () => buildAlertsKqlFilter('_id', originalAlertIds),
    [originalAlertIds]
  );

  return (
    <div data-test-subj={SUMMARY_TAB_TEST_ID}>
      <EuiSpacer size="s" />

      <div data-test-subj={SUMMARY_CONTENT_TEST_ID}>
        <AttackDiscoveryMarkdownFormatter
          scopeId={TableId.alertsOnAttacksPage}
          disableActions={showAnonymized}
          markdown={showAnonymized ? summaryMarkdown : summaryMarkdownWithReplacements}
        />
      </div>

      <EuiSpacer />

      <EuiTitle data-test-subj={DETAILS_TITLE_TEST_ID} size="xs">
        <h2>{i18n.DETAILS}</h2>
      </EuiTitle>
      <EuiSpacer size="s" />

      <div data-test-subj={DETAILS_CONTENT_TEST_ID}>
        <AttackDiscoveryMarkdownFormatter
          scopeId={TableId.alertsOnAttacksPage}
          disableActions={showAnonymized}
          markdown={showAnonymized ? detailsMarkdown : detailsMarkdownWithReplacements}
        />
      </div>

      <EuiSpacer />

      {tacticMetadata.length > 0 && (
        <>
          <EuiTitle data-test-subj={ATTACK_CHAIN_TITLE_TEST_ID} size="xs">
            <h2>{i18n.ATTACK_CHAIN}</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <AttackChain attackDiscovery={attack} />
          <EuiSpacer size="l" />
        </>
      )}

      <InvestigateInTimelineButton
        asEmptyButton={true}
        dataProviders={null}
        filters={investigateInTimelineFilters}
      >
        <EuiFlexGroup
          alignItems="center"
          data-test-subj={INVESTIGATE_IN_TIMELINE_BUTTON_TEST_ID}
          gutterSize="xs"
          responsive={false}
          wrap={false}
        >
          <EuiFlexItem grow={false}>
            <EuiIcon data-test-subj={TIMELINE_ICON_TEST_ID} type="timeline" />
          </EuiFlexItem>
          <EuiFlexItem data-test-subj={INVESTIGATE_IN_TIMELINE_LABEL_TEST_ID} grow={false}>
            {i18n.INVESTIGATE_IN_TIMELINE}
          </EuiFlexItem>
        </EuiFlexGroup>
      </InvestigateInTimelineButton>
    </div>
  );
});
SummaryTab.displayName = 'SummaryTab';
