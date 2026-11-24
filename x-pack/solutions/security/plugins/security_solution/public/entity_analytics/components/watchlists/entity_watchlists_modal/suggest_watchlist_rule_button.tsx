/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnInfoCallout } from '@kbn/ui-callout';
import { SecurityAgentBuilderAttachments } from '../../../../../common/constants';
import type { EntityType } from '../../../../../common/entity_analytics/types';
import { NewAgentBuilderAttachment } from '../../../../agent_builder/components/new_agent_builder_attachment';
import { useAgentBuilderAttachment } from '../../../../agent_builder/hooks/use_agent_builder_attachment';
import { useAgentBuilderAvailability } from '../../../../agent_builder/hooks/use_agent_builder_availability';

interface SuggestWatchlistRuleButtonProps {
  entityName: string;
  entityType: EntityType;
  watchlistName?: string;
  /** Called once Agent Builder was opened, so the caller can close what is in the way. */
  onOpened?: () => void;
}

const RULE_GUIDANCE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityWatchlists.suggestRuleGuidance',
  {
    defaultMessage:
      "Inspect this entity's attributes and pick the right source type: an Entity Store source when a KQL query on entity attributes (with an entity type clause) matches similar entities, or an index source when the evidence lives in raw logs (only then ask me for the index pattern, do not guess one). Check how many entities a few candidate queries match, then propose two or three options, from narrow to broad, and ask me to choose one. Describe each option in plain language, for example 'extreme impact users', with how many entities it matches, without showing the query unless I ask for it. If the watchlist already has members, take them into account and avoid options that match a large share of the store. Check the existing data sources of the watchlist and warn me if the chosen rule would replace or remove one. Ask me only this one question: as soon as I have chosen, create the watchlist if it does not exist yet and set the rule right away. The tools ask for my confirmation before anything is saved.",
  }
);

const getPrompt = (watchlistName?: string): string =>
  watchlistName
    ? i18n.translate('xpack.securitySolution.entityAnalytics.entityWatchlists.suggestRulePrompt', {
        defaultMessage:
          'Add entities like this one to the watchlist "{watchlistName}" (create it if it does not exist yet) automatically with a rule-based source. {guidance}',
        values: { watchlistName, guidance: RULE_GUIDANCE },
      })
    : i18n.translate(
        'xpack.securitySolution.entityAnalytics.entityWatchlists.suggestRuleNoWatchlistPrompt',
        {
          defaultMessage:
            'Add entities like this one to a watchlist automatically with a rule-based source. Ask me which watchlist to use, or whether to create a new one, together with the question about the options. {guidance}',
          values: { guidance: RULE_GUIDANCE },
        }
      );

export const SuggestWatchlistRuleButton = memo(
  ({ entityName, entityType, watchlistName, onOpened }: SuggestWatchlistRuleButtonProps) => {
    const { isAgentChatExperienceEnabled } = useAgentBuilderAvailability();

    const attachment = useMemo(
      () => ({
        attachmentType: SecurityAgentBuilderAttachments.entity,
        attachmentData: {
          identifierType: entityType,
          identifier: entityName,
          attachmentLabel: `${entityType}: ${entityName}`,
        },
        attachmentPrompt: getPrompt(watchlistName),
        autoSendInitialMessage: true,
      }),
      [entityName, entityType, watchlistName]
    );
    const { openAgentBuilderFlyout } = useAgentBuilderAttachment(attachment);

    const onClick = useCallback(() => {
      openAgentBuilderFlyout();
      onOpened?.();
    }, [openAgentBuilderFlyout, onOpened]);

    if (!isAgentChatExperienceEnabled) {
      return null;
    }

    return (
      <>
        <EuiSpacer size="m" />
        <KbnInfoCallout
          size="s"
          data-test-subj="entityWatchlistsSuggestRule"
          title={i18n.translate(
            'xpack.securitySolution.entityAnalytics.entityWatchlists.suggestRuleTitle',
            { defaultMessage: 'Want similar entities added automatically?' }
          )}
          text={
            <>
              <p>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.entityWatchlists.suggestRuleBody',
                  {
                    defaultMessage:
                      'A rule keeps a watchlist up to date for you. Agent Builder can suggest one based on this entity.',
                  }
                )}
              </p>
              <NewAgentBuilderAttachment
                onClick={onClick}
                size="s"
                label={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.entityWatchlists.suggestRuleButton',
                  { defaultMessage: 'Suggest a rule' }
                )}
                iconType="sparkles"
                telemetry={{ pathway: 'entity_flyout', attachments: ['entity'] }}
              />
            </>
          }
        />
      </>
    );
  }
);
SuggestWatchlistRuleButton.displayName = 'SuggestWatchlistRuleButton';
