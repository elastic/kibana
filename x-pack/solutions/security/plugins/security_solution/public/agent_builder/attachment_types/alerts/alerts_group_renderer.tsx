/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ComponentType } from 'react';
import { GroupedAttachmentRow } from '@kbn/agentic-investigations-common';
import type { FlyoutGroupedAttachmentRendererProps } from '@kbn/agentic-investigations-common';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { ISearchGeneric } from '@kbn/search-types';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';
import { APP_UI_ID, DEFAULT_ALERTS_INDEX, SecurityPageName } from '../../../../common/constants';
import { FLYOUT_DESCRIPTOR_KIND } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';
import type { FlyoutDescriptor } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';
import { ALERT_SUBTITLE, FlyoutRow, alertsTitle, useSpaceId } from '../grouped_attachments';
import { buildAlertsPagePath } from './build_alerts_page_path';
import { collectAlerts } from './collect_alerts';
import { useAlertRuleName } from './use_alert_rule_name';

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
    const { ids, descriptors, names, createdAt } = collectAlerts(attachments);

    if (!spaceId || ids.length === 0) {
      return null;
    }

    if (ids.length === 1) {
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

    const href = application.getUrlForApp(APP_UI_ID, {
      deepLinkId: SecurityPageName.alerts,
      path: buildAlertsPagePath(ids, createdAt ?? new Date().toISOString()),
    });

    return (
      <GroupedAttachmentRow
        iconType="warning"
        iconColor="danger"
        title={alertsTitle(ids.length)}
        action={{ kind: 'page', href }}
      />
    );
  };

  return AlertsGroupRenderer;
};
