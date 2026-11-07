/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTab, EuiTabs } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { ExternalAgentProvider } from './external_agent_provider';

export type AgentSource = ExternalAgentProvider | 'agent_builder';

export const AgentSourceSelector: React.FC<{
  source: AgentSource;
  onChange: (source: AgentSource) => void;
}> = ({ source, onChange }) => (
  <>
    <EuiTabs
      size="s"
      aria-label={i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.agentSource.label',
        { defaultMessage: 'Agent telemetry source' }
      )}
    >
      <EuiTab isSelected={source === 'codex'} onClick={() => onChange('codex')}>
        {i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.agentSource.codex', {
          defaultMessage: 'Codex',
        })}
      </EuiTab>
      <EuiTab isSelected={source === 'cursor'} onClick={() => onChange('cursor')}>
        {i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.agentSource.cursor', {
          defaultMessage: 'Cursor',
        })}
      </EuiTab>
      <EuiTab isSelected={source === 'claude_desktop'} onClick={() => onChange('claude_desktop')}>
        {i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.agentSource.claudeDesktop',
          {
            defaultMessage: 'Claude Desktop',
          }
        )}
      </EuiTab>
      <EuiTab isSelected={source === 'google_adk'} onClick={() => onChange('google_adk')}>
        {i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.agentSource.googleAdk',
          {
            defaultMessage: 'Google ADK',
          }
        )}
      </EuiTab>
      <EuiTab isSelected={source === 'agent_builder'} onClick={() => onChange('agent_builder')}>
        {i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.agentSource.builder', {
          defaultMessage: 'Elastic Agent Builder',
        })}
      </EuiTab>
    </EuiTabs>
  </>
);
