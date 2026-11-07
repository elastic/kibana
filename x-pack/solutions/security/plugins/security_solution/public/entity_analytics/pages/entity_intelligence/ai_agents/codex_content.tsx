/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { createContentRedactor } from '../../../../../common/entity_intelligence/content_redaction';
import type { AgentCapturedText } from '../../../../../common/entity_intelligence/content_redaction';
import { IntelligencePanel } from '../components';
import { AgentTimestamp } from './agent_evidence';
import type { CodexSession } from './codex_types';

export const CapturedAgentText: React.FC<{ value: AgentCapturedText; title: string }> = ({
  value,
  title,
}) => {
  const safe = createContentRedactor().redact(value.text, 8000);
  return (
    <div data-test-subj="agentCapturedText">
      <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h4>{title}</h4>
          </EuiTitle>
        </EuiFlexItem>
        {(value.redacted || safe.redacted) && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.codex.content.redacted',
                { defaultMessage: 'Credentials redacted' }
              )}
            </EuiBadge>
          </EuiFlexItem>
        )}
        {(value.truncated || safe.truncated) && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="warning">
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.codex.content.truncated',
                { defaultMessage: 'Truncated' }
              )}
            </EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiCodeBlock language="text" fontSize="s" paddingSize="m" isCopyable overflowHeight={360}>
        {safe.text}
      </EuiCodeBlock>
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        <p>
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.codex.content.source',
            {
              defaultMessage: 'Recorded source: {source} · Credential filtering applied',
              values: { source: value.source },
            }
          )}
        </p>
      </EuiText>
    </div>
  );
};

export const CodexSessionPrompts: React.FC<{ session: CodexSession }> = ({ session }) => {
  const prompts = session.prompts ?? [];
  return (
    <IntelligencePanel>
      <EuiTitle size="xs">
        <h3>
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.codex.content.prompts',
            { defaultMessage: 'User prompts' }
          )}
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      {!prompts.length ? (
        <EuiText size="s" color="subdued">
          <p>
            {session.contentMode === 'redacted_local'
              ? i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.codex.content.noPrompts',
                  {
                    defaultMessage:
                      'No native user prompts were captured in this session snapshot.',
                  }
                )
              : i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.codex.content.disabled',
                  {
                    defaultMessage:
                      'This snapshot contains metadata only. Enable redacted content in the local collector to capture prompts and tool inputs.',
                  }
                )}
          </p>
        </EuiText>
      ) : (
        <>
          <EuiText size="xs" color="subdued">
            <p>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.codex.content.promptCount',
                {
                  defaultMessage:
                    '{shown, number} of {total, number} recorded prompts · Most recent first',
                  values: { shown: prompts.length, total: session.promptsTotal ?? prompts.length },
                }
              )}
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          {[...prompts].reverse().map((prompt, index) => (
            <React.Fragment key={prompt.id}>
              <EuiAccordion
                id={`${session.id}-prompt-${index}`}
                initialIsOpen={index === 0}
                buttonContent={
                  <span>
                    <AgentTimestamp value={prompt.timestamp} />
                    {' · '}
                    {prompt.text.replace(/\s+/g, ' ').slice(0, 100)}
                  </span>
                }
                paddingSize="m"
              >
                <CapturedAgentText
                  value={prompt}
                  title={i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.codex.content.prompt',
                    { defaultMessage: 'Recorded prompt' }
                  )}
                />
              </EuiAccordion>
              <EuiSpacer size="s" />
            </React.Fragment>
          ))}
        </>
      )}
      {session.promptsTruncated && (
        <EuiText size="xs" color="subdued">
          <p>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.codex.content.promptBound',
              { defaultMessage: 'Only the latest 50 prompts are retained in this snapshot.' }
            )}
          </p>
        </EuiText>
      )}
    </IntelligencePanel>
  );
};
