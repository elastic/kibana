/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery, Replacements } from '@kbn/elastic-assistant-common';
import { replaceAnonymizedValuesWithOriginalValues } from '@kbn/elastic-assistant-common';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';

import { useKibana } from '../../../../../../common/lib/kibana';
import { AttackChain } from './attack/attack_chain';
import { InvestigateInTimelineButton } from '../../../../../../common/components/event_details/investigate_in_timeline_button';
import { buildAlertsKqlFilter } from '../../../../../../detections/components/alerts_table/actions';
import { getTacticMetadata, getOriginalAlertIds } from '../../../../../helpers';
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
    () => getOriginalAlertIds(attackDiscovery.alertIds, replacements),
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
          alertIds={originalAlertIds}
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
          alertIds={originalAlertIds}
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

      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
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
        <EuiFlexItem grow={false}>
          <InvestigateInTimelineButton
            asEmptyButton={true}
            data-test-subj="investigateInTimelineButton"
            dataProviders={null}
            filters={filters}
            flush="both"
            iconType="timeline"
            size="m"
          >
            {i18n.INVESTIGATE_IN_TIMELINE}
          </InvestigateInTimelineButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />
    </div>
  );
};

AttackDiscoveryTabComponent.displayName = 'AttackDiscoveryTab';

export const AttackDiscoveryTab = React.memo(AttackDiscoveryTabComponent);
