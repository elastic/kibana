/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { DetailsBlock } from '@kbn/agentic-investigations-common';

/**
 * POC — the "Attachment summary" section from Bonnie's mock (fixed order Alerts → Attacks → Rules
 * → Entities). Every row is rendered through the Security Solution `security.alert` renderer (a
 * generic flyout-link opener) looked up from the shared Agent Builder attachment registry, so
 * clicking a row opens the matching flyout_v2 flyout — alert / attack / rule / host / user — while
 * all the flyout wiring stays inside `security_solution`. Identifiers are hardcoded from the local
 * stack for the demo.
 */

const SECURITY_ALERT_ATTACHMENT_TYPE = 'security.alert';

// Real identifiers pulled from the local stack. Swap these for your own.
const POC_LINKS = {
  alert: {
    kind: 'alert',
    documentId: '3c9378d6e0a01730a1bf204c85d8d28a6f77add8ed1bda56fa0fe15edaeb2aab',
    indexName: '.internal.alerts-security.alerts-default-000001',
  },
  attack: {
    kind: 'attack',
    attackId: '1a5a116f-72ce-457b-b5eb-7983340c117f',
    indexName: '.internal.alerts-security.attack.discovery.alerts-default-000001',
  },
  rule: { kind: 'rule', ruleId: 'c00f94e3-f553-4c8b-a97d-c4267b33ad09' },
  host: { kind: 'host', hostName: 'SRV-FILE01' },
  user: { kind: 'user', userName: 'dev-user' },
} as const;

interface AttachmentEntry {
  label: string;
  icon: string;
  link: Record<string, unknown>;
}

interface AttachmentGroup {
  key: string;
  label: string;
  entries: AttachmentEntry[];
}

const GROUPS: AttachmentGroup[] = [
  {
    key: 'alerts',
    label: i18n.translate('xpack.alertzero.attachmentSummary.alerts', { defaultMessage: 'Alerts' }),
    entries: [{ label: 'Endpoint Security alert', icon: 'bell', link: POC_LINKS.alert }],
  },
  {
    key: 'attacks',
    label: i18n.translate('xpack.alertzero.attachmentSummary.attacks', {
      defaultMessage: 'Attacks',
    }),
    entries: [{ label: 'Attack discovery', icon: 'bolt', link: POC_LINKS.attack }],
  },
  {
    key: 'rules',
    label: i18n.translate('xpack.alertzero.attachmentSummary.rules', { defaultMessage: 'Rules' }),
    entries: [
      { label: 'Endpoint Security (Elastic Defend)', icon: 'documents', link: POC_LINKS.rule },
    ],
  },
  {
    key: 'entities',
    label: i18n.translate('xpack.alertzero.attachmentSummary.entities', {
      defaultMessage: 'Entities',
    }),
    entries: [
      { label: 'SRV-FILE01', icon: 'desktop', link: POC_LINKS.host },
      { label: 'dev-user', icon: 'user', link: POC_LINKS.user },
    ],
  },
];

const SECTION_TITLE = i18n.translate('xpack.alertzero.attachmentSummary.title', {
  defaultMessage: 'Attachment summary',
});

const FallbackRow: React.FC<{ entry: AttachmentEntry }> = ({ entry }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel hasBorder paddingSize="s" style={{ borderRadius: euiTheme.size.s }}>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={entry.icon} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">{entry.label}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

/**
 * Renders one clickable entry through the Security Solution flyout-link renderer, looked up from
 * the shared Agent Builder attachment registry. Falls back to a static row if the renderer is not
 * available (e.g. Security Solution not started yet).
 */
const FlyoutLinkEntry: React.FC<{ entry: AttachmentEntry }> = ({ entry }) => {
  const { services } = useKibana<{ agentBuilder?: AgentBuilderPluginStart }>();
  const definition = services.agentBuilder?.attachments.getAttachmentUiDefinition(
    SECURITY_ALERT_ATTACHMENT_TYPE
  );
  const render = definition?.renderConversationDetailsContent;

  if (!render) {
    return <FallbackRow entry={entry} />;
  }

  const attachment = {
    id: `${String(entry.link.kind)}-${entry.label}`,
    type: SECURITY_ALERT_ATTACHMENT_TYPE,
    data: { link: entry.link, label: entry.label, icon: entry.icon },
  } as unknown as Parameters<typeof render>[0]['attachment'];

  return <>{render({ attachment })}</>;
};

export const AttachmentSummary = () => (
  <DetailsBlock title={SECTION_TITLE}>
    <EuiFlexGroup direction="column" gutterSize="m">
      {GROUPS.map((group) => (
        <EuiFlexItem key={group.key}>
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiFlexItem>
              <EuiText size="xs" color="subdued">
                <strong>{group.label}</strong>
              </EuiText>
            </EuiFlexItem>
            {group.entries.map((entry) => (
              <EuiFlexItem key={entry.label}>
                <FlyoutLinkEntry entry={entry} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  </DetailsBlock>
);
