/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export type ExternalAgentProvider = 'codex' | 'cursor' | 'claude_desktop' | 'google_adk';

export const isExternalAgentProvider = (value?: string | null): value is ExternalAgentProvider =>
  value === 'codex' || value === 'cursor' || value === 'claude_desktop' || value === 'google_adk';

export const externalAgentLabel = (provider: ExternalAgentProvider = 'codex'): string =>
  ({ codex: 'Codex', cursor: 'Cursor', claude_desktop: 'Claude Desktop', google_adk: 'Google ADK' }[
    provider
  ]);

export const externalAgentSourceKind = (
  provider: ExternalAgentProvider = 'codex'
):
  | 'codex_local_session'
  | 'cursor_local_session'
  | 'claude_desktop_local_session'
  | 'google_adk_cloud_run' =>
  provider === 'google_adk' ? 'google_adk_cloud_run' : `${provider}_local_session`;

export const externalAgentIndex = (
  spaceId: string,
  provider: ExternalAgentProvider = 'codex'
): string => `logs-${provider}.entity_intelligence-${spaceId}`;

export const externalAgentGrouping = (
  provider: ExternalAgentProvider = 'codex',
  plural = false
): string =>
  provider === 'google_adk'
    ? plural
      ? i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.googleAdk.runs', {
          defaultMessage: 'Runs',
        })
      : i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.googleAdk.run', {
          defaultMessage: 'Run',
        })
    : provider === 'claude_desktop'
    ? plural
      ? i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.claudeDesktop.connections',
          { defaultMessage: 'MCP connections' }
        )
      : i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.claudeDesktop.connection',
          { defaultMessage: 'MCP connection' }
        )
    : plural
    ? i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.externalAgent.sessions', {
        defaultMessage: 'Sessions',
      })
    : i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.externalAgent.session', {
        defaultMessage: 'Session',
      });

export const externalAgentGroupsInSentence = (provider: ExternalAgentProvider = 'codex'): string =>
  provider === 'claude_desktop'
    ? externalAgentGrouping(provider, true)
    : provider === 'google_adk'
    ? i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.googleAdk.runsNoun', {
        defaultMessage: 'runs',
      })
    : i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.externalAgent.sessionsNoun',
        {
          defaultMessage: 'sessions',
        }
      );

export const externalAgentMapLabel = (provider: ExternalAgentProvider = 'codex'): string =>
  provider === 'google_adk'
    ? i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.googleAdk.map', {
        defaultMessage: 'Run map',
      })
    : provider === 'claude_desktop'
    ? i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.claudeDesktop.map', {
        defaultMessage: 'MCP connection map',
      })
    : i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.externalAgent.map', {
        defaultMessage: 'Session map',
      });

export const externalAgentGroupIdLabel = (provider: ExternalAgentProvider = 'codex'): string =>
  provider === 'claude_desktop'
    ? i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.claudeDesktop.connectionId',
        { defaultMessage: 'MCP connection ID' }
      )
    : i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.externalAgent.sessionId',
        { defaultMessage: 'Session ID' }
      );

export const claudeDesktopCoverage = (): string =>
  i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.claudeDesktop.coverage', {
    defaultMessage:
      'Observed at the local MCP tool boundary. An MCP connection can span multiple chats. Chat IDs, prompts and the authenticated human requester are not observed. The local OS account owns and runs the bridge; it is not proof of who requested an action. Client identity is reported by the MCP client, not authenticated.',
  });

export const googleAdkCoverage = (): string =>
  i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.googleAdk.coverage', {
    defaultMessage:
      'The application verifies the requester’s Google identity; Cloud Run metadata identifies the executing service account. Ownership is declared separately. Document editors appear only when a Google audit record matches the consumed object version. These records establish account attribution, not who physically typed a request or why the model acted.',
  });
