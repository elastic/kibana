/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery, Replacements } from '@kbn/elastic-assistant-common';
import { replaceAnonymizedValuesWithOriginalValues } from '@kbn/elastic-assistant-common';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSpacer, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';

import { useKibana } from '../../../../../../common/lib/kibana';
import { AttackChain } from './attack/attack_chain';
import { InvestigateInTimelineButton } from '../../../../../../common/components/event_details/investigate_in_timeline_button';
import { buildAlertsKqlFilter } from '../../../../../../detections/components/alerts_table/actions';
import { getTacticMetadata } from '../../../../../helpers';
import { AttackDiscoveryMarkdownFormatter } from '../../../attack_discovery_markdown_formatter';
import * as i18n from './translations';
import { ViewInAiAssistant } from '../../view_in_ai_assistant';
import { SECURITY_FEATURE_ID } from '../../../../../../../common';
import { useAgentBuilderAvailability } from '../../../../../../agent_builder/hooks/use_agent_builder_availability';
import { NewAgentBuilderAttachment } from '../../../../../../agent_builder/components/new_agent_builder_attachment';
import { useAttackDiscoveryAttachment } from '../../../use_attack_discovery_attachment';

const scrollable = css`
  overflow-x: auto;
  scrollbar-width: thin;
`;

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
  const {
    application: { capabilities },
  } = useKibana().services;
  // TODO We shouldn't have to check capabilities here, this should be done at a much higher level.
  //  https://github.com/elastic/kibana/issues/218731
  //  For the EASE we need to hide cell actions and all preview links that could open non-EASE flyouts
  const disabledActions = useMemo(
    () => showAnonymized || Boolean(capabilities[SECURITY_FEATURE_ID].configurations),
    [capabilities, showAnonymized]
  );

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

  const tacticMetadata = useMemo(
    () => getTacticMetadata(attackDiscovery.mitreAttackTactics),
    [attackDiscovery]
  );

  const originalAlertIds = useMemo(
    () => attackDiscovery.alertIds.map((id) => replacements?.[id] ?? id),
    [attackDiscovery.alertIds, replacements]
  );

  const filters = useMemo(() => buildAlertsKqlFilter('_id', originalAlertIds), [originalAlertIds]);

  const { isAgentChatExperienceEnabled } = useAgentBuilderAvailability();

  const openAgentBuilderFlyout = useAttackDiscoveryAttachment(attackDiscovery, replacements);

  return (
    <div data-test-subj="attackDiscoveryTab">
      <EuiTitle data-test-subj="summaryTitle" size="xs">
        <h2>{i18n.SUMMARY}</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <div css={scrollable} data-test-subj="summaryContent">
        <AttackDiscoveryMarkdownFormatter
          disableActions={disabledActions}
          markdown={showAnonymized ? summaryMarkdown : summaryMarkdownWithReplacements}
        />
      </div>

      <EuiSpacer />

      <EuiTitle data-test-subj="detailsTitle" size="xs">
        <h2>{i18n.DETAILS}</h2>
      </EuiTitle>
      <EuiSpacer size="s" />

      <div css={scrollable} data-test-subj="detailsContent">
        <AttackDiscoveryMarkdownFormatter
          disableActions={disabledActions}
          markdown={showAnonymized ? detailsMarkdown : detailsMarkdownWithReplacements}
        />
      </div>

      <EuiSpacer />

      {tacticMetadata.length > 0 && (
        <>
          <EuiTitle data-test-subj="attackChainTitle" size="xs">
            <h2>{i18n.ATTACK_CHAIN}</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <AttackChain attackTactics={attackDiscovery.mitreAttackTactics} />
          <EuiSpacer size="l" />
        </>
      )}

      <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
        <EuiFlexItem grow={false}>
          {isAgentChatExperienceEnabled ? (
            <NewAgentBuilderAttachment
              onClick={openAgentBuilderFlyout}
              telemetry={{
                pathway: 'attack_discovery_top',
                attachments: ['alert'],
              }}
            />
          ) : (
            <ViewInAiAssistant attackDiscovery={attackDiscovery} replacements={replacements} />
          )}
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
              responsive={false}
              wrap={false}
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
