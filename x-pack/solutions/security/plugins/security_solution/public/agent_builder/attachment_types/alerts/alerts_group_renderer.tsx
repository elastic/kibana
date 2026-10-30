/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { ComponentType } from 'react';
import { GroupedAttachmentRow } from '@kbn/agentic-investigations-common';
import type {
  FlyoutGroupedAttachmentRendererProps,
  GroupedAttachmentRowAction,
} from '@kbn/agentic-investigations-common';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { ISearchGeneric } from '@kbn/search-types';
import {
  buildAlertsPagePath,
  MAX_ALERTS_PAGE_PATH_LENGTH,
} from '@kbn/securitysolution-alerts-page-url';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';
import {
  ALERTS_PATH,
  APP_UI_ID,
  DEFAULT_ALERTS_INDEX,
  DEFAULT_DATA_VIEW_ID,
} from '../../../../common/constants';
import { FLYOUT_DESCRIPTOR_KIND } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';
import type { FlyoutDescriptor } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';
import {
  ALERT_SUBTITLE,
  ALERTS_FALLBACK_TITLE,
  FlyoutRow,
  alertsTitle,
  useSpaceId,
} from '../grouped_attachments';
import { collectAlerts } from './collect_alerts';
import { useAlertRuleName } from './use_alert_rule_name';
import { useTaggedAlertsCount } from './use_tagged_alerts_count';

export interface AlertsGroupRendererDeps {
  application: ApplicationStart;
  getSpaceId: () => Promise<string>;
  search: ISearchGeneric;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}

interface SingleAlertRowProps {
  alertId: string;
  descriptor: FlyoutDescriptor;
  knownName?: string;
  spaceId: string;
  search: ISearchGeneric;
  resolveSecurityCanvasContext: AlertsGroupRendererDeps['resolveSecurityCanvasContext'];
}

const SingleAlertRow = ({
  alertId,
  descriptor,
  knownName,
  spaceId,
  search,
  resolveSecurityCanvasContext,
}: SingleAlertRowProps) => {
  const ruleName = useAlertRuleName({ alertId, knownName, spaceId, search });

  return (
    <FlyoutRow
      iconType="warning"
      iconColor="danger"
      title={ruleName ?? alertsTitle(1)}
      subtitle={ruleName ? ALERT_SUBTITLE : undefined}
      descriptor={descriptor}
      resolveSecurityCanvasContext={resolveSecurityCanvasContext}
    />
  );
};

export const createAlertsGroupRenderer = ({
  application,
  getSpaceId,
  search,
  resolveSecurityCanvasContext,
}: AlertsGroupRendererDeps): ComponentType<FlyoutGroupedAttachmentRendererProps> => {
  const AlertsGroupRenderer = ({ attachments }: FlyoutGroupedAttachmentRendererProps) => {
    const spaceId = useSpaceId(getSpaceId);
    // collectAlerts builds new arrays on every call, and the tag count searches whenever they change.
    const { ids, tags, descriptors, names, createdAt } = useMemo(
      () => collectAlerts(attachments),
      [attachments]
    );
    const taggedCount = useTaggedAlertsCount({ alertIds: ids, tags, createdAt, spaceId, search });

    if (!spaceId || (ids.length === 0 && tags.length === 0)) {
      return null;
    }

    if (ids.length === 1 && tags.length === 0) {
      const [id] = ids;
      const descriptor = descriptors.get(id) ?? {
        kind: FLYOUT_DESCRIPTOR_KIND.documentFromPattern,
        documentId: id,
        indexName: `${DEFAULT_ALERTS_INDEX}-${spaceId}`,
      };

      return (
        <SingleAlertRow
          key={id}
          alertId={id}
          descriptor={descriptor}
          knownName={names.get(id)}
          spaceId={spaceId}
          search={search}
          resolveSecurityCanvasContext={resolveSecurityCanvasContext}
        />
      );
    }

    const count = tags.length > 0 ? taggedCount : ids.length;

    const path = buildAlertsPagePath(
      ids,
      createdAt ?? new Date().toISOString(),
      // The Alerts page opens on the Security default data view of the space.
      { tags, dataViewId: `${DEFAULT_DATA_VIEW_ID}-${spaceId}` }
    );

    // Past this length the page could refuse the link's URL, so the row only counts the alerts.
    const action: GroupedAttachmentRowAction | undefined =
      path.length > MAX_ALERTS_PAGE_PATH_LENGTH
        ? undefined
        : {
            kind: 'page',
            // Pass the alerts path directly. Without the Alerts privilege that deep link
            // is omitted, and getUrlForApp would leave the Security app root.
            href: application.getUrlForApp(APP_UI_ID, { path: `${ALERTS_PATH}${path}` }),
          };

    return (
      <GroupedAttachmentRow
        iconType="warning"
        iconColor="danger"
        title={count === undefined ? ALERTS_FALLBACK_TITLE : alertsTitle(count)}
        action={action}
      />
    );
  };

  return AlertsGroupRenderer;
};
