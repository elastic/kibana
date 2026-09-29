/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import type { ISearchStart } from '@kbn/data-plugin/public';
import { EuiLoadingSpinner } from '@elastic/eui';
import { AttachmentGroupList, AttachmentRow } from '@kbn/agentic-investigations-common';
import type { AttachmentGroupRendererProps } from '@kbn/agentic-investigations-common';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { toAlertDescriptor } from '../attachment_types/attachment_summary_drilldown/to_flyout_descriptor';
import { AttachmentSummaryFlyoutOpener } from '../attachment_types/attachment_summary_drilldown/open_flyout_on_mount';
import type { SecurityCanvasEmbeddedBundle } from '../components/security_redux_embedded_provider';
import { FLYOUT_DESCRIPTOR_KIND } from '../../flyout_v2/shared/url_state/flyout_v2_url_param';
import type { FlyoutDescriptor } from '../../flyout_v2/shared/url_state/flyout_v2_url_param';
import { createFindAlerts } from '../../flyout_v2/document/tools/correlations/services/find_alerts';

const ALERT_RULE_NAME_FIELD = 'kibana.alert.rule.name';

const firstFieldValue = (
  fields: Record<string, unknown[]> | undefined,
  name: string
): string | undefined => {
  const values = fields?.[name];
  return Array.isArray(values) && typeof values[0] === 'string' ? values[0] : undefined;
};

// ---------------------------------------------------------------------------
// AlertRow — a single clickable (or read-only) alert row
// ---------------------------------------------------------------------------

interface AlertRowProps {
  label: string;
  descriptor: FlyoutDescriptor | null;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}

const AlertRow = memo<AlertRowProps>(({ label, descriptor, resolveSecurityCanvasContext }) => {
  const [flyoutKey, setFlyoutKey] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = useCallback(() => {
    setFlyoutKey((k) => k + 1);
    setIsOpen(true);
  }, []);

  return (
    <AttachmentRow
      label={label}
      typeName="Alert"
      iconType="warning"
      onClick={descriptor ? handleClick : undefined}
    >
      {isOpen && descriptor && (
        <AttachmentSummaryFlyoutOpener
          key={flyoutKey}
          descriptor={descriptor}
          resolveSecurityCanvasContext={resolveSecurityCanvasContext}
        />
      )}
    </AttachmentRow>
  );
});

AlertRow.displayName = 'AlertRow';

// ---------------------------------------------------------------------------
// AlertsAttachmentRowsResolver — fetches alerts for a security.alerts
// attachment and reports resolved rows to the parent via onRowsResolved.
// Renders nothing itself so the parent can flatten all rows into one list
// and let AttachmentGroupList handle show-more/less uniformly.
// ---------------------------------------------------------------------------

interface AlertsAttachmentRowsResolverProps {
  attachment: UnknownAttachment;
  alertsIndex: string;
  findAlerts: ReturnType<typeof createFindAlerts>;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
  onRowsResolved: (id: string, rows: React.ReactNode[]) => void;
}

const AlertsAttachmentRowsResolver = memo<AlertsAttachmentRowsResolverProps>(
  ({ attachment, alertsIndex, findAlerts, resolveSecurityCanvasContext, onRowsResolved }) => {
    const alertIds = useMemo(() => {
      const ids = (attachment.data as { alertIds?: unknown })?.alertIds;
      return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
    }, [attachment.data]);

    const alertIdsKey = alertIds.join(',');

    useEffect(() => {
      if (alertIds.length === 0) {
        onRowsResolved(attachment.id, []);
        return;
      }

      const controller = new AbortController();

      findAlerts({
        alertIds,
        from: 0,
        size: alertIds.length,
        index: alertsIndex,
        signal: controller.signal,
      })
        .then((response) => {
          const resolvedRows = response.hits.hits.map((hit) => {
            const ruleName =
              firstFieldValue(
                hit.fields as Record<string, unknown[]> | undefined,
                ALERT_RULE_NAME_FIELD
              ) ?? hit._id;
            const descriptor: FlyoutDescriptor | null =
              hit._id && hit._index
                ? {
                    kind: FLYOUT_DESCRIPTOR_KIND.document,
                    documentId: hit._id,
                    indexName: hit._index,
                  }
                : null;
            return (
              <AlertRow
                key={hit._id}
                label={ruleName}
                descriptor={descriptor}
                resolveSecurityCanvasContext={resolveSecurityCanvasContext}
              />
            );
          });
          onRowsResolved(attachment.id, resolvedRows);
        })
        .catch(() => {
          onRowsResolved(attachment.id, []);
        });

      return () => controller.abort();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      alertIdsKey,
      alertsIndex,
      findAlerts,
      resolveSecurityCanvasContext,
      onRowsResolved,
      attachment.id,
    ]);

    return null;
  }
);

AlertsAttachmentRowsResolver.displayName = 'AlertsAttachmentRowsResolver';

// ---------------------------------------------------------------------------
// createAlertGroupRenderer — factory that captures dependencies at registration
// ---------------------------------------------------------------------------

export const createAlertGroupRenderer = (
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>,
  search: ISearchStart,
  alertsIndex: string
): React.ComponentType<AttachmentGroupRendererProps> => {
  const findAlerts = createFindAlerts(search);

  const AlertGroupRenderer = memo<AttachmentGroupRendererProps>(({ group, attachmentsService }) => {
    const [resolvedRowsMap, setResolvedRowsMap] = useState<Map<string, React.ReactNode[]>>(
      () => new Map()
    );

    const handleRowsResolved = useCallback((id: string, rows: React.ReactNode[]) => {
      setResolvedRowsMap((prev) => new Map(prev).set(id, rows));
    }, []);

    const rows: React.ReactNode[] = [];
    const resolvers: React.ReactNode[] = [];

    for (const attachment of group.attachments) {
      if (attachment.type === SecurityAgentBuilderAttachments.alerts) {
        resolvers.push(
          <AlertsAttachmentRowsResolver
            key={attachment.id}
            attachment={attachment}
            alertsIndex={alertsIndex}
            findAlerts={findAlerts}
            resolveSecurityCanvasContext={resolveSecurityCanvasContext}
            onRowsResolved={handleRowsResolved}
          />
        );

        const resolved = resolvedRowsMap.get(attachment.id);
        if (resolved == null) {
          rows.push(
            <AttachmentRow
              key={`loading-${attachment.id}`}
              label="Loading…"
              typeName="Alert"
              iconType="warning"
            >
              <EuiLoadingSpinner size="s" />
            </AttachmentRow>
          );
        } else {
          rows.push(...resolved);
        }
      } else {
        const label = (() => {
          try {
            return (
              attachmentsService.getAttachmentUiDefinition(attachment.type)?.getLabel(attachment) ??
              attachment.type
            );
          } catch {
            return attachment.type;
          }
        })();

        if (attachment.type === SecurityAgentBuilderAttachments.alert) {
          rows.push(
            <AlertRow
              key={attachment.id}
              label={label}
              descriptor={toAlertDescriptor(attachment)}
              resolveSecurityCanvasContext={resolveSecurityCanvasContext}
            />
          );
        } else {
          rows.push(
            <AttachmentRow key={attachment.id} label={label} typeName="Alert" iconType="warning" />
          );
        }
      }
    }

    return (
      <>
        {resolvers}
        <AttachmentGroupList title={group.title ?? group.id} rows={rows} />
      </>
    );
  });

  AlertGroupRenderer.displayName = 'AlertGroupRenderer';
  return AlertGroupRenderer;
};
