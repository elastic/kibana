/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiIcon,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { AiExplainView } from './ai_explain_view';
import type { AiExplainViewProps } from './ai_explain_view';

export interface AiExplainFlyoutProps extends AiExplainViewProps {
  /** Subtitle under the flyout title (e.g. the focus entity name). */
  subtitle: string | undefined;
  onClose: () => void;
}

/**
 * Large, right-side flyout that hosts the AI explanation for both Explorer
 * entry points (graph "Explain this" and timeline "Explain this"). Uses a
 * spacious `l` size so the narrative + graphics have real room, renders as an
 * overlay above the graph/timeline/dossier (coexisting with the existing
 * docking, like the raw-doc flyout) and does not occlude them once dismissed.
 * Esc / close / mask all dismiss it via `EuiFlyout`.
 */
export const AiExplainFlyout: React.FC<AiExplainFlyoutProps> = ({
  subtitle,
  onClose,
  ...viewProps
}) => {
  const titleId = useGeneratedHtmlId({ prefix: 'aiExplainFlyout' });
  return (
    <EuiFlyout
      ownFocus
      size="l"
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="entityIntelligenceAiExplainFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="sparkles" size="l" color="primary" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiTitle size="s">
              <h2 id={titleId}>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.explorer.aiExplainFlyoutTitle',
                  { defaultMessage: 'AI explanation' }
                )}
              </h2>
            </EuiTitle>
            {subtitle ? (
              <EuiText size="xs" color="subdued">
                <span
                  css={css`
                    overflow-wrap: anywhere;
                  `}
                >
                  {subtitle}
                </span>
              </EuiText>
            ) : null}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <AiExplainView {...viewProps} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
