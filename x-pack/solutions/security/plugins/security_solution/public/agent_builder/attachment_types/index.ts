/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { ISessionService } from '@kbn/data-plugin/public';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import type { ExperimentalFeatures } from '../../../common/experimental_features';
import { createEntityAttachmentDefinition } from './entity_attachment';
import type { SecurityCanvasEmbeddedBundle } from '../components/security_redux_embedded_provider';
import type { SecurityAgentBuilderChrome } from './entity_explore_navigation';

/**
 * Extension of UnknownAttachment that includes an optional attachmentLabel field in the data property
 */
type UnknownAttachmentWithLabel = Attachment<
  string,
  { attachmentLabel?: string } & Record<string, unknown>
>;

interface AttachmentTypeConfig {
  type: SecurityAgentBuilderAttachments;
  label: string;
  icon: string;
}

const ALERT_ATTACHMENT_CONFIG: AttachmentTypeConfig = {
  type: SecurityAgentBuilderAttachments.alert,
  label: i18n.translate('xpack.securitySolution.agentBuilder.attachments.alert.label', {
    defaultMessage: 'Security Alert',
  }),
  icon: 'bell',
};

const ENTITY_ATTACHMENT_LABEL_ONLY_CONFIG: AttachmentTypeConfig = {
  type: SecurityAgentBuilderAttachments.entity,
  label: i18n.translate('xpack.securitySolution.agentBuilder.attachments.entity.label', {
    defaultMessage: 'Risk Entity',
  }),
  icon: 'user',
};

const createAttachmentTypeConfig = (defaultLabel: string, icon: string) => ({
  getLabel: (attachment: UnknownAttachmentWithLabel) => {
    const attachmentLabel = attachment?.data?.attachmentLabel;
    return attachmentLabel ?? defaultLabel;
  },
  getIcon: () => icon,
});

/**
 * Registers the baseline attachment UI definitions that do not require Security Solution runtime
 * context:
 *   - `security.alert` — label + icon only (no rich renderer yet).
 *   - `security.entity` — label-only fallback used when the `entityAttachmentRichRenderer`
 *     experimental flag is off. The rich entity renderer (card/table + Canvas) is installed via
 *     the separate `registerEntityAttachment` entry point below so the plugin's `start()` can
 *     supply `application`, `chrome`, `agentBuilder`, and the lazy Redux/services bundle.
 */
export const registerAttachmentUiDefinitions = (
  attachments: AttachmentServiceStartContract,
  { experimentalFeatures }: { experimentalFeatures: ExperimentalFeatures }
) => {
  attachments.addAttachmentType<UnknownAttachmentWithLabel>(
    ALERT_ATTACHMENT_CONFIG.type,
    createAttachmentTypeConfig(ALERT_ATTACHMENT_CONFIG.label, ALERT_ATTACHMENT_CONFIG.icon)
  );

  if (!experimentalFeatures.entityAttachmentRichRenderer) {
    attachments.addAttachmentType<UnknownAttachmentWithLabel>(
      ENTITY_ATTACHMENT_LABEL_ONLY_CONFIG.type,
      createAttachmentTypeConfig(
        ENTITY_ATTACHMENT_LABEL_ONLY_CONFIG.label,
        ENTITY_ATTACHMENT_LABEL_ONLY_CONFIG.icon
      )
    );
  }
};

/**
 * Registers the rich `security.entity` attachment renderer (entity card for a single entity,
 * entity table with per-row Explore links for multiple, Canvas preview for single host/user/
 * service). Callable from `plugin.tsx#start()` alongside `registerRuleAttachment` /
 * `registerEntityAnalyticsDashboardAttachment` once the Security sub-plugins and services are
 * available.
 *
 * Noops when the `entityAttachmentRichRenderer` experimental flag is off — in that case the
 * label-only fallback registered by {@link registerAttachmentUiDefinitions} stays active.
 */
export const registerEntityAttachment = ({
  attachments,
  application,
  agentBuilder,
  chrome,
  experimentalFeatures,
  resolveSecurityCanvasContext,
  searchSession,
}: {
  attachments: AttachmentServiceStartContract;
  application: ApplicationStart;
  agentBuilder?: AgentBuilderPluginStart;
  chrome?: SecurityAgentBuilderChrome;
  experimentalFeatures: ExperimentalFeatures;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
  searchSession?: ISessionService;
}): void => {
  if (!experimentalFeatures.entityAttachmentRichRenderer) {
    return;
  }
  attachments.addAttachmentType(
    SecurityAgentBuilderAttachments.entity,
    createEntityAttachmentDefinition({
      experimentalFeatures,
      application,
      agentBuilder,
      chrome,
      resolveSecurityCanvasContext,
      searchSession,
    })
  );
};
