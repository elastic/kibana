/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { replaceAnonymizedValuesWithOriginalValues } from '@kbn/elastic-assistant-common';
import type { AttackDiscovery, Replacements } from '@kbn/elastic-assistant-common';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSpacer, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';

import { AttackChain } from './attack/attack_chain';
import { InvestigateInTimelineButton } from '../../../../../../common/components/event_details/investigate_in_timeline_button';
import { buildAlertsKqlFilter } from '../../../../../../detections/components/alerts_table/actions';
import { getTacticMetadata } from '../../../../../helpers';
import { AttackDiscoveryMarkdownFormatter } from '../../../attack_discovery_markdown_formatter';
import * as i18n from './translations';
import { ViewInAiAssistant } from '../../view_in_ai_assistant';

interface Props {
  attackDiscovery: AttackDiscovery;
  replacements?: Replacements;
  showAnonymized?: boolean;
}

const AttackDiscoveryTabComponent: React.FC<Props> = ({
  attackDiscovery,
  replacements,
  showAnonymized = false,
}) => {
  const { euiTheme } = useEuiTheme();
  const { detailsMarkdown, summaryMarkdown } = useMemo(() => attackDiscovery, [attackDiscovery]);

  const summaryMarkdownWithReplacements = useMemo(
    () =>
      replaceAnonymizedValuesWithOriginalValues({
        messageContent: summaryMarkdown,
        replacements: replacements ?? {},
      }),
    [replacements, summaryMarkdown]
  );

  const detailsMarkdownWithReplacements = useMemo(
    () =>
      replaceAnonymizedValuesWithOriginalValues({
        messageContent: detailsMarkdown,
        replacements: replacements ?? {},
      }),
    [detailsMarkdown, replacements]
  );

  const tacticMetadata = useMemo(() => getTacticMetadata(attackDiscovery), [attackDiscovery]);

  const originalAlertIds = useMemo(
    () => attackDiscovery.alertIds.map((id) => replacements?.[id] ?? id),
    [attackDiscovery.alertIds, replacements]
  );

  const filters = useMemo(() => buildAlertsKqlFilter('_id', originalAlertIds), [originalAlertIds]);

  return (
    <div data-test-subj="attackDiscoveryTab">
      <EuiTitle data-test-subj="summaryTitle" size="xs">
        <h2>{i18n.SUMMARY}</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <AttackDiscoveryMarkdownFormatter
        disableActions={showAnonymized}
        markdown={showAnonymized ? summaryMarkdown : summaryMarkdownWithReplacements}
      />

      <EuiSpacer />

      <EuiTitle data-test-subj="detailsTitle" size="xs">
        <h2>{i18n.DETAILS}</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <AttackDiscoveryMarkdownFormatter
        disableActions={showAnonymized}
        markdown={showAnonymized ? detailsMarkdown : detailsMarkdownWithReplacements}
      />

      <EuiSpacer />

      {tacticMetadata.length > 0 && (
        <>
          <EuiTitle data-test-subj="attackChainTitle" size="xs">
            <h2>{i18n.ATTACK_CHAIN}</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <AttackChain attackDiscovery={attackDiscovery} />
          <EuiSpacer size="l" />
        </>
      )}

      <EuiFlexGroup alignItems="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          <ViewInAiAssistant attackDiscovery={attackDiscovery} replacements={replacements} />
        </EuiFlexItem>
        <EuiFlexItem
          css={css`
            margin-left: ${euiTheme.size.m};
            margin-top: ${euiTheme.size.xs};
          `}
          grow={false}
        >
          <InvestigateInTimelineButton asEmptyButton={true} dataProviders={null} filters={filters}>
            <EuiFlexGroup
              alignItems="center"
              data-test-subj="investigateInTimelineButton"
              gutterSize="xs"
            >
              <EuiFlexItem grow={false}>
                <EuiIcon data-test-subj="timelineIcon" type="timeline" />
              </EuiFlexItem>
              <EuiFlexItem data-test-subj="investigateInTimelineLabel" grow={false}>
                {i18n.INVESTIGATE_IN_TIMELINE}
              </EuiFlexItem>
            </EuiFlexGroup>
          </InvestigateInTimelineButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />
    </div>
  );
};

AttackDiscoveryTabComponent.displayName = 'AttackDiscoveryTab';

export const AttackDiscoveryTab = React.memo(AttackDiscoveryTabComponent);
