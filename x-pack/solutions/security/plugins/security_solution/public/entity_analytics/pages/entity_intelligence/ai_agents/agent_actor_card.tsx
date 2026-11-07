/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiDescriptionList,
  EuiIcon,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  transparentize,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AgentResolvedActor } from './agent_actor_identity';
import type { AgentInvocation } from './types';

export interface AgentActorCardProps {
  invocation: AgentInvocation;
  resolvedActor?: AgentResolvedActor;
  isLoading?: boolean;
}

export const AgentActorCard: React.FC<AgentActorCardProps> = ({
  invocation,
  resolvedActor,
  isLoading = false,
}) => {
  const { euiTheme } = useEuiTheme();
  const titleId = useGeneratedHtmlId({ prefix: 'agentActor' });
  const [isOpen, setIsOpen] = useState(false);
  const initiatingActor = invocation.attribution?.initiatingActor;
  const identity = initiatingActor ?? invocation.attribution?.caller;
  const name = identity?.name?.trim() || (!isLoading ? resolvedActor?.name : undefined);
  const hasReference = Boolean(identity?.id || identity?.hash);
  const isApiKey = !initiatingActor && invocation.attribution?.caller?.type === 'api_key';
  const role = initiatingActor
    ? i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.agents.graph.initiatingActor',
        { defaultMessage: 'Initiating actor' }
      )
    : i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.agents.graph.caller', {
        defaultMessage: 'Kibana caller',
      });
  const label =
    name ??
    (isLoading
      ? i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.agents.actor.resolving',
          { defaultMessage: 'Resolving user…' }
        )
      : isApiKey
      ? i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.agents.actor.apiKey', {
          defaultMessage: 'API key',
        })
      : hasReference
      ? i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.agents.actor.unresolved',
          { defaultMessage: 'Name not resolved' }
        )
      : i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.agents.graph.actorUnknown',
          { defaultMessage: 'Not recorded' }
        ));
  const details = [
    {
      title: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.agents.actor.name',
        {
          defaultMessage: 'Name',
        }
      ),
      description: label,
    },
    ...(resolvedActor && !isLoading
      ? [
          {
            title: i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.agents.actor.username',
              { defaultMessage: 'Username' }
            ),
            description: resolvedActor.username ?? '—',
          },
          {
            title: i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.agents.actor.matchedProfile',
              { defaultMessage: 'Matched profile ID' }
            ),
            description: resolvedActor.id,
          },
          {
            title: i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.agents.actor.round',
              { defaultMessage: 'Conversation round' }
            ),
            description: resolvedActor.roundId,
          },
        ]
      : []),
    {
      title: identity?.hash
        ? i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.agents.actor.traceHash',
            { defaultMessage: 'Recorded actor hash' }
          )
        : i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.agents.actor.traceId',
            { defaultMessage: 'Recorded identity ID' }
          ),
      description: identity?.hash ?? identity?.id ?? '—',
    },
    {
      title: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.agents.actor.source',
        { defaultMessage: 'Identity source' }
      ),
      description:
        invocation.attribution?.source === 'kibana_authc'
          ? i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.agents.actor.authentication',
              { defaultMessage: 'Kibana authentication' }
            )
          : invocation.attribution?.source ?? '—',
    },
  ];
  return (
    <>
      <button
        type="button"
        data-test-subj="agentGraphActor"
        onClick={() => setIsOpen(true)}
        aria-label={i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.agents.actor.inspect',
          { defaultMessage: 'Inspect {role}: {name}', values: { role, name: label } }
        )}
        css={css`
          position: absolute;
          left: 20px;
          top: 46px;
          width: 170px;
          height: 92px;
          border: ${euiTheme.border.thin};
          border-radius: ${euiTheme.border.radius.panel};
          padding: ${euiTheme.size.m};
          background: ${euiTheme.colors.emptyShade};
          box-shadow: 0 3px 10px ${transparentize(euiTheme.colors.fullShade, 0.04)};
          color: ${euiTheme.colors.textParagraph};
          text-align: left;
          cursor: pointer;
          &:hover {
            border-color: ${euiTheme.colors.primary};
          }
          &:focus-visible {
            outline: 2px solid ${euiTheme.colors.primary};
            outline-offset: 3px;
          }
        `}
      >
        <EuiIcon
          type={isApiKey ? 'key' : 'user'}
          color={name ? 'primary' : 'subdued'}
          aria-hidden={true}
        />
        <EuiText
          size="s"
          css={css`
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          `}
        >
          <strong>{label}</strong>
        </EuiText>
        <EuiText size="xs" color="subdued">
          {role}
        </EuiText>
      </button>
      {isOpen && (
        <EuiModal onClose={() => setIsOpen(false)} aria-labelledby={titleId}>
          <EuiModalHeader>
            <EuiModalHeaderTitle id={titleId}>{role}</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiText size="s">
              <p>
                {resolvedActor && !isLoading
                  ? i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.agents.actor.matchedDescription',
                      {
                        defaultMessage:
                          'The author of this conversation round matches the authenticated actor recorded in this trace. The name comes from a conversation you can access; the original trace identity is preserved.',
                      }
                    )
                  : name
                  ? i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.agents.actor.recordedDescription',
                      { defaultMessage: 'This name is recorded directly in the execution trace.' }
                    )
                  : i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.agents.actor.unresolvedDescription',
                      {
                        defaultMessage:
                          'A name is shown only when recorded in the trace or matched to the author of the exact conversation round. Agent creators, conversation owners and the current viewer are not used as substitutes.',
                      }
                    )}
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiDescriptionList
              listItems={details}
              type="column"
              css={css`
                overflow-wrap: anywhere;
              `}
            />
          </EuiModalBody>
        </EuiModal>
      )}
    </>
  );
};
