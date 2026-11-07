/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiSkeletonText,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { i18n } from '@kbn/i18n';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { useCodexContent } from './use_codex_content';
import { useKibana } from '../../../../common/lib/kibana';
import { AgentTimestamp } from './agent_evidence';
import { CapturedAgentText, CodexSessionPrompts } from './codex_content';
import { GoogleAdkContextPanel } from './google_adk_context';
import {
  externalAgentGroupIdLabel,
  claudeDesktopCoverage,
  googleAdkCoverage,
} from './external_agent_provider';
import { getCodexSessionTitle } from './codex_model';
import type { CodexSession, CodexToolEvent } from './codex_types';
import type { SecurityFindingsResult } from '../security_findings/types';
import { FindingDetails } from '../security_findings/security_findings_panel';
import { securityGraphOutcome } from './security_graph_nodes';
import {
  findingMatchesToolEvent,
  readableSecurityFindings,
  securityFindingKey,
} from './security_graph_model';

export const CodexEvidence: React.FC<{
  session: CodexSession;
  event?: CodexToolEvent;
  security?: SecurityFindingsResult;
  onClose: () => void;
}> = ({ session, event, security, onClose }) => {
  const { share } = useKibana().services;
  const [selectedFindingKey, setSelectedFindingKey] = useState<string>();
  const findings = event
    ? readableSecurityFindings(security).filter((finding) =>
        findingMatchesToolEvent(finding, event)
      )
    : [];
  const selectedFinding = findings.find(
    (finding) => securityFindingKey(finding) === selectedFindingKey
  );
  useEffect(() => {
    if (selectedFindingKey && !selectedFinding) setSelectedFindingKey(undefined);
  }, [selectedFindingKey, selectedFinding]);
  const detail = useCodexContent(useSpaceId(), session, event);
  const capturedInput = detail.event?.input;
  const capturedOutput = detail.event?.output ?? detail.session?.finalResponse;
  const googleAdk = detail.event?.googleAdk ?? detail.session?.googleAdk;
  const titleId = useGeneratedHtmlId({ prefix: 'codexEvidence' });
  const source = event?.source ?? session.source;
  const locator = share?.url.locators.get<DiscoverAppLocatorParams>('DISCOVER_APP_LOCATOR');
  const url = locator?.getRedirectUrl({
    dataViewSpec: { title: source.index, timeFieldName: '@timestamp' },
    query: { language: 'kuery', query: `_id: ${JSON.stringify(source.id)}` },
    timeRange: {
      from: new Date(Date.parse(session.start) - 86400000).toISOString(),
      to: new Date(Date.parse(session.lastSeen) + 86400000).toISOString(),
    },
    columns: [
      '@timestamp',
      'event.action',
      'tool.name',
      'event.outcome',
      'duration_ms',
      'session.id',
    ],
  });
  if (selectedFinding)
    return (
      <FindingDetails finding={selectedFinding} onClose={() => setSelectedFindingKey(undefined)} />
    );
  return (
    <EuiModal onClose={onClose} aria-labelledby={titleId} maxWidth={800}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>
          {event?.toolName ?? getCodexSessionTitle(session)}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        {findings.length > 0 && (
          <>
            {findings.map((finding) => (
              <div key={securityFindingKey(finding)}>
                <EuiButtonEmpty
                  size="s"
                  iconType="shield"
                  onClick={() => setSelectedFindingKey(securityFindingKey(finding))}
                >
                  {securityGraphOutcome(finding)}
                  {' · '}
                  {finding.policy?.name ?? finding.rule.name}
                </EuiButtonEmpty>
              </div>
            ))}
            <EuiSpacer size="m" />
          </>
        )}
        {detail.isLoading ? (
          <>
            <EuiSkeletonText lines={4} />
            <EuiSpacer size="m" />
          </>
        ) : detail.unavailable ? (
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.codex.evidence.contentDenied',
                {
                  defaultMessage:
                    'Content evidence is unavailable. Check access to this source and retry.',
                }
              )}
            </p>
          </EuiText>
        ) : capturedInput ? (
          <>
            <CapturedAgentText
              value={capturedInput}
              title={
                capturedInput.kind === 'command'
                  ? i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.codex.evidence.command',
                      { defaultMessage: 'Recorded command' }
                    )
                  : i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.codex.evidence.arguments',
                      { defaultMessage: 'Recorded arguments' }
                    )
              }
            />
            <EuiSpacer size="m" />
          </>
        ) : event ? (
          <>
            <EuiText size="s" color="subdued">
              <p>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.codex.evidence.noInput',
                  {
                    defaultMessage:
                      'Input content was not captured for this observation. Exact source references remain available below.',
                  }
                )}
              </p>
            </EuiText>
            <EuiSpacer size="m" />
          </>
        ) : detail.session?.provider === 'claude_desktop' ? (
          <EuiText size="s" color="subdued">
            <p>{claudeDesktopCoverage()}</p>
          </EuiText>
        ) : detail.session ? (
          <>
            <CodexSessionPrompts session={detail.session} />
            <EuiSpacer size="m" />
          </>
        ) : (
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.codex.evidence.contentUnavailable',
                { defaultMessage: 'Content evidence could not be loaded.' }
              )}
            </p>
          </EuiText>
        )}

        {!detail.isLoading && !detail.unavailable && capturedOutput && (
          <>
            <CapturedAgentText
              value={capturedOutput}
              title={
                !event
                  ? i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.googleAdk.finalResponse',
                      { defaultMessage: 'Recorded final answer' }
                    )
                  : i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.externalAgent.recordedResult',
                      { defaultMessage: 'Recorded tool result' }
                    )
              }
            />
            <EuiSpacer size="m" />
          </>
        )}
        {!detail.isLoading && !detail.unavailable && googleAdk && (
          <>
            <GoogleAdkContextPanel context={googleAdk} />
            <EuiSpacer size="m" />
          </>
        )}
        <EuiDescriptionList
          type="column"
          listItems={[
            {
              title: i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.codex.evidence.observed',
                { defaultMessage: 'Observed at' }
              ),
              description: <AgentTimestamp value={event?.timestamp ?? session.lastSeen} />,
            },
            {
              title: session.googleAdk
                ? i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.googleAdk.agentService',
                    { defaultMessage: 'Agent service' }
                  )
                : i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.codex.evidence.installation',
                    {
                      defaultMessage: 'Agent installation',
                    }
                  ),
              description: session.agentId,
            },
            {
              title: externalAgentGroupIdLabel(session.provider),
              description: session.id,
            },
            ...(event
              ? [
                  {
                    title: i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.codex.evidence.call',
                      {
                        defaultMessage: 'Recorded call or item ID',
                      }
                    ),
                    description: event.id,
                  },
                ]
              : []),
            {
              title: i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.codex.evidence.index',
                { defaultMessage: 'Source index' }
              ),
              description: source.index,
            },
            {
              title: i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.codex.evidence.document',
                { defaultMessage: 'Document ID' }
              ),
              description: source.id,
            },
          ]}
        />
        <EuiSpacer size="m" />
        <EuiCodeBlock language="json" fontSize="s" isCopyable>
          {JSON.stringify(
            event
              ? {
                  tool: event.toolName,
                  observation_type: event.observationType,
                  process_exit_code: event.exitCode,
                  turn_id: event.turnId,
                  type: event.toolType,
                  outcome: event.outcome,
                  duration_ms: event.durationMs,
                  model: event.model,
                  sandbox: event.sandbox,
                  approval_policy: event.approval,
                  source_record_hash: event.recordHash,
                }
              : {
                  start: session.start,
                  observed_through: session.lastSeen,
                  imported_at: session.ingestedAt,
                  owner: session.owner,
                  creator: session.creator,
                  parent_session_id: session.parentId,
                  nickname: session.nickname,
                  role: session.role,
                  agent_path: session.agentPath,
                  model: session.model,
                  models: session.models,
                  sandbox: session.sandbox,
                  approval_policy: session.approval,
                  summary_complete: session.summaryComplete,
                  source_file_hash: session.fileHash,
                  tools: session.tools,
                },
            null,
            2
          )}
        </EuiCodeBlock>
        <EuiSpacer size="m" />
        <EuiText size="xs" color="subdued">
          <p>
            {session.provider === 'google_adk'
              ? googleAdkCoverage()
              : session.provider === 'claude_desktop'
              ? claudeDesktopCoverage()
              : i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.codex.evidence.provenance',
                  {
                    defaultMessage:
                      'Imported from local agent session records. Content is bounded and credential-filtered before indexing. Source-reported metadata does not establish the authenticated caller of each operation. Outputs and reasoning are not captured.',
                  }
                )}
          </p>
        </EuiText>
      </EuiModalBody>
      <EuiModalFooter>
        {url && (
          <EuiButtonEmpty href={url} target="_blank" iconType="external">
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.codex.evidence.discover',
              { defaultMessage: 'Open document in Discover' }
            )}
          </EuiButtonEmpty>
        )}
        <EuiButtonEmpty onClick={onClose}>
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.codex.evidence.close',
            { defaultMessage: 'Close' }
          )}
        </EuiButtonEmpty>
      </EuiModalFooter>
    </EuiModal>
  );
};
