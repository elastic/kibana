/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { GoogleAdkContext } from '../../../../../common/entity_intelligence/google_adk';
import { IntelligencePanel } from '../components';
import { AgentTimestamp } from './agent_evidence';
import { googleAdkCoverage } from './external_agent_provider';
import type { CodexToolEvent } from './codex_types';

/** Keeps authenticated execution, declared ownership and audited content edits distinct. */
export const GoogleAdkContextPanel: React.FC<{
  context: GoogleAdkContext;
  events?: CodexToolEvent[];
  onInspectEvent?: (event: CodexToolEvent) => void;
}> = ({ context, events = [], onInspectEvent }) => {
  const { euiTheme } = useEuiTheme();
  const accordionId = useGeneratedHtmlId({ prefix: 'googleAdkResources' });
  const editors = [
    ...new Set(
      context.resources.flatMap((resource) => (resource.editor ? [resource.editor.email] : []))
    ),
  ];
  const roles = [
    {
      icon: 'user',
      title: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.googleAdk.requester',
        { defaultMessage: 'Authenticated requester' }
      ),
      value: context.requester.email,
      source: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.googleAdk.requesterSource',
        { defaultMessage: 'Verified Google ID token' }
      ),
    },
    {
      icon: 'key',
      title: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.googleAdk.runtime',
        { defaultMessage: 'Executing service account' }
      ),
      value: context.runtime.email,
      source: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.googleAdk.runtimeSource',
        { defaultMessage: 'Cloud Run service identity' }
      ),
    },
    {
      icon: 'users',
      title: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.googleAdk.owner', {
        defaultMessage: 'Declared account owner',
      }),
      value: context.owner?.email ?? '—',
      source: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.googleAdk.ownerSource',
        { defaultMessage: 'Ownership register' }
      ),
    },
    {
      icon: 'document',
      title: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.googleAdk.editor',
        { defaultMessage: 'Audited document editor' }
      ),
      value: editors.join(', ') || '—',
      source: editors.length
        ? i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.googleAdk.editorSource',
            { defaultMessage: 'Audit + consumed object version' }
          )
        : i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.googleAdk.editorMissing',
            { defaultMessage: 'No matched edit in this evidence' }
          ),
    },
  ];
  return (
    <IntelligencePanel>
      <div data-test-subj="googleAdkIdentityEvidence">
        <EuiTitle size="xs">
          <h3>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.googleAdk.identityTitle',
              { defaultMessage: 'Who requested, executed and influenced this run?' }
            )}
          </h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        <div
          css={css`
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: ${euiTheme.size.m};
            @media (max-width: 640px) {
              grid-template-columns: 1fr;
            }
          `}
        >
          {roles.map((role) => (
            <div
              key={role.title}
              css={css`
                padding: ${euiTheme.size.m};
                border: ${euiTheme.border.thin};
                border-radius: ${euiTheme.border.radius.medium};
                overflow-wrap: anywhere;
              `}
            >
              <EuiText size="xs" color="subdued">
                <EuiIcon type={role.icon} color="primary" aria-hidden={true} /> {role.title}
              </EuiText>
              <EuiSpacer size="xs" />
              <EuiText size="s">
                <strong>{role.value}</strong>
              </EuiText>
              <EuiSpacer size="xs" />
              <EuiText size="xs" color="subdued">
                {role.source}
              </EuiText>
            </div>
          ))}
        </div>
        <EuiSpacer size="m" />
        <EuiText size="xs" color="subdued">
          <p>{googleAdkCoverage()}</p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiAccordion
          key={context.run_id}
          id={accordionId}
          initialIsOpen={editors.length > 0}
          buttonContent={i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.googleAdk.objectEvidence',
            {
              defaultMessage: 'Object versions and audit evidence ({count})',
              values: { count: context.resources.length },
            }
          )}
        >
          <EuiSpacer size="m" />
          {context.resources.map((resource, index) => {
            const event = events.find((item) => item.id === resource.tool_call_id);
            const audit = context.audit_matches.filter(
              (item) => item.tool_call_id === resource.tool_call_id
            );
            return (
              <div
                key={`${resource.tool_call_id}:${resource.uri}:${resource.generation}`}
                css={css`
                  border-top: ${index ? euiTheme.border.thin : 'none'};
                  padding: ${euiTheme.size.m} 0;
                  overflow-wrap: anywhere;
                `}
              >
                <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="document" color="primary" aria-hidden={true} />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s">
                      <strong>{resource.uri}</strong>
                    </EuiText>
                  </EuiFlexItem>
                  {resource.editor && (
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="warning">
                        {i18n.translate(
                          'xpack.securitySolution.entityAnalytics.intelligence.googleAdk.editedVersion',
                          { defaultMessage: 'Edited version consumed' }
                        )}
                      </EuiBadge>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                {resource.editor && (
                  <>
                    <EuiText size="s">
                      <strong>{resource.editor.email}</strong>
                      {' · '}
                      <AgentTimestamp value={resource.editor.timestamp} />
                    </EuiText>
                    <EuiSpacer size="s" />
                  </>
                )}
                <EuiDescriptionList
                  compressed
                  type="responsiveColumn"
                  listItems={[
                    {
                      title: i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.googleAdk.generation',
                        { defaultMessage: 'Object generation' }
                      ),
                      description: resource.generation,
                    },
                    { title: 'SHA-256', description: resource.sha256 },
                    {
                      title: i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.googleAdk.auditPrincipal',
                        { defaultMessage: 'Storage audit principal' }
                      ),
                      description:
                        [...new Set(audit.map((item) => item.principal))].join(', ') || '—',
                    },
                    {
                      title: i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.googleAdk.contentVerified',
                        { defaultMessage: 'Version content verified' }
                      ),
                      description: resource.content_verified
                        ? i18n.translate(
                            'xpack.securitySolution.entityAnalytics.intelligence.googleAdk.hashMatched',
                            { defaultMessage: 'Generation-pinned bytes match the recorded hash' }
                          )
                        : i18n.translate(
                            'xpack.securitySolution.entityAnalytics.intelligence.googleAdk.hashUnverified',
                            {
                              defaultMessage:
                                'Recorded by the application; independent content verification unavailable',
                            }
                          ),
                    },
                  ]}
                />
                {event && onInspectEvent && (
                  <EuiButtonEmpty size="s" iconType="inspect" onClick={() => onInspectEvent(event)}>
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.googleAdk.inspectCall',
                      { defaultMessage: 'Inspect {tool}', values: { tool: event.toolName } }
                    )}
                  </EuiButtonEmpty>
                )}
                <EuiSpacer size="s" />
                <EuiCodeBlock
                  language="json"
                  fontSize="s"
                  paddingSize="s"
                  overflowHeight={160}
                  isCopyable
                >
                  {JSON.stringify(
                    {
                      tool_call_id: resource.tool_call_id,
                      edit_audit_id: resource.editor?.audit_id,
                      change_id: resource.editor?.change_id,
                      tool_audit_records: audit.map((item) => ({
                        id: item.audit_id,
                        method: item.method,
                        timestamp: item.timestamp,
                      })),
                    },
                    null,
                    2
                  )}
                </EuiCodeBlock>
              </div>
            );
          })}
          <EuiDescriptionList
            compressed
            type="responsiveColumn"
            listItems={[
              {
                title: i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.googleAdk.project',
                  { defaultMessage: 'Google Cloud project' }
                ),
                description: context.project_id,
              },
              {
                title: i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.googleAdk.revision',
                  { defaultMessage: 'Cloud Run revision' }
                ),
                description: context.revision,
              },
              {
                title: i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.googleAdk.runId',
                  { defaultMessage: 'Run ID' }
                ),
                description: context.run_id,
              },
              {
                title: i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.googleAdk.traceId',
                  { defaultMessage: 'Trace ID' }
                ),
                description: context.trace_id,
              },
              ...(context.owner
                ? [
                    {
                      title: i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.googleAdk.ownership',
                        { defaultMessage: 'Ownership recorded by' }
                      ),
                      description: (
                        <>
                          {context.owner.recorded_by}
                          {' · '}
                          <AgentTimestamp value={context.owner.effective_from} />
                        </>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </EuiAccordion>
      </div>
    </IntelligencePanel>
  );
};
