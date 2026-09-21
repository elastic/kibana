/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiText } from '@elastic/eui';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import {
  SecurityReduxEmbeddedProvider,
  type SecurityCanvasEmbeddedBundle,
} from '../../components/security_redux_embedded_provider';
import { useFlyoutApi } from '../../../flyout_v2/use_flyout_api';
import { useInitDataViewManager } from '../../../data_view_manager/hooks/use_init_data_view_manager';
import { useDataViewManagerStatus } from '../../../data_view_manager/hooks/use_data_view_manager_status';

/**
 * POC: a discriminated link describing which flyout_v2 flyout to open and with what identifiers.
 * The AlertZero attachment summary passes one of these per row; this renderer opens the matching
 * flyout. All are opened with `session: 'start'` sharing the investigation flyout's `historyKey`
 * (via the ambient session context in AlertZero), so EUI groups them into one history with Back.
 */
export type FlyoutLink =
  | { kind: 'alert'; documentId: string; indexName: string }
  | { kind: 'attack'; attackId: string; indexName: string }
  | { kind: 'rule'; ruleId: string }
  | { kind: 'host'; hostName: string }
  | { kind: 'user'; userName: string };

type FlyoutLinkAttachment = Attachment<
  'security.alert',
  { link?: FlyoutLink; label?: string; icon?: string }
>;

const DEFAULT_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.attachments.flyoutLink.detailsLabel',
  { defaultMessage: 'Open details' }
);

/**
 * Kicks off the Security data view manager when it is still pristine. The document and attack
 * flyouts resolve their document via `useDataView(PageScope.default)`, which stays `'pristine'` —
 * an infinite spinner — unless something triggers the default data view load. Inside the Security
 * app the app shell does this; on an AlertZero surface it does not, so we mirror
 * `RulePreviewAttachmentDataViewBootstrap`. The init writes to the shared embedded store, which is
 * the same store the opened system flyout reads.
 */
const FlyoutDataViewBootstrap: React.FC = () => {
  const initDataViewManager = useInitDataViewManager();
  const status = useDataViewManagerStatus();

  React.useEffect(() => {
    if (status === 'pristine' || status === 'error') {
      initDataViewManager([]);
    }
  }, [initDataViewManager, status]);

  return null;
};

/**
 * The clickable row. Mounted inside {@link SecurityReduxEmbeddedProvider} so `useFlyoutApi`
 * resolves the Security store + router + services it needs even though this renders on an AlertZero
 * surface outside the Security app shell. Clicking opens the matching flyout_v2 flyout as a core
 * system flyout over the current app.
 */
const OpenFlyoutRow: React.FC<{ link: FlyoutLink; label: string; icon: string }> = ({
  link,
  label,
  icon,
}) => {
  const {
    openDocumentFlyoutFromIndex,
    openAttackFlyout,
    openRuleFlyout,
    openHostFlyout,
    openUserFlyout,
  } = useFlyoutApi();

  const onClick = () => {
    switch (link.kind) {
      case 'alert':
        openDocumentFlyoutFromIndex({
          documentId: link.documentId,
          indexName: link.indexName,
          title: label,
        });
        break;
      case 'attack':
        openAttackFlyout({ attackId: link.attackId, indexName: link.indexName, attackTitle: label });
        break;
      case 'rule':
        openRuleFlyout({ ruleId: link.ruleId, title: label });
        break;
      case 'host':
        openHostFlyout({ hostName: link.hostName, title: label });
        break;
      case 'user':
        openUserFlyout({ userName: link.userName, title: label });
        break;
    }
  };

  return (
    <EuiPanel
      hasBorder
      paddingSize="s"
      onClick={onClick}
      data-test-subj={`alertZeroAttachmentSummaryRow-${link.kind}`}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={icon} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">{label}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

/**
 * Builds the rich attachment UI definition used by the AlertZero attachment summary.
 * `renderConversationDetailsContent` returns a clickable row that opens the flyout_v2 flyout
 * described by the attachment's `link`.
 */
export const createAlertAttachmentDefinition = ({
  resolveSecurityCanvasContext,
}: {
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}): AttachmentUIDefinition<FlyoutLinkAttachment> => ({
  getLabel: (attachment) => attachment?.data?.label ?? DEFAULT_LABEL,
  getIcon: (attachment) => attachment?.data?.icon ?? 'link',
  renderConversationDetailsContent: ({ attachment }) => {
    const link = attachment?.data?.link;
    if (!link) {
      return null;
    }
    return (
      <SecurityReduxEmbeddedProvider resolveCanvasContext={resolveSecurityCanvasContext}>
        <FlyoutDataViewBootstrap />
        <OpenFlyoutRow
          link={link}
          label={attachment?.data?.label ?? DEFAULT_LABEL}
          icon={attachment?.data?.icon ?? 'link'}
        />
      </SecurityReduxEmbeddedProvider>
    );
  },
});
