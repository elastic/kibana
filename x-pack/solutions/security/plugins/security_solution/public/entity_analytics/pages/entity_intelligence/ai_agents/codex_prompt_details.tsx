/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSkeletonText, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { CapturedAgentText, CodexSessionPrompts } from './codex_content';
import { useCodexContent } from './use_codex_content';
import type { CodexSession } from './codex_types';

export const CodexPromptDetails: React.FC<{ session: CodexSession }> = ({ session }) => {
  const content = useCodexContent(useSpaceId(), session);
  if (content.isLoading) return <EuiSkeletonText lines={4} />;
  if (content.unavailable || !content.session)
    return (
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.codex.content.unavailable',
            { defaultMessage: 'Content evidence could not be loaded for this session.' }
          )}
        </p>
      </EuiText>
    );
  return (
    <>
      <CodexSessionPrompts session={content.session} />
      {content.session.provider === 'google_adk' && content.session.finalResponse && (
        <>
          <EuiSpacer size="m" />
          <CapturedAgentText
            value={content.session.finalResponse}
            title={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.googleAdk.finalResponse',
              { defaultMessage: 'Recorded final answer' }
            )}
          />
          <EuiText size="xs" color="subdued">
            <p>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.googleAdk.answerNotExecution',
                {
                  defaultMessage:
                    'An action mentioned in the answer is not evidence that a tool executed it. Inspect the run map for recorded operations and policy findings.',
                }
              )}
            </p>
          </EuiText>
        </>
      )}
    </>
  );
};
