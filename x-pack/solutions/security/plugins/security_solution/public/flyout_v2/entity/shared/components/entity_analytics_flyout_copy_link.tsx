/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import React, { useMemo } from 'react';
import { useAppUrl } from '../../../../common/lib/kibana/hooks';
import { useNewEntityAnalyticsPage } from '../../../../entity_analytics/hooks/use_new_entity_analytics_page';
import { ShareUrlIconButton } from '../../../shared/components/share_url_icon_button';
import {
  encodeFlyoutV2UrlParam,
  FLYOUT_V2_URL_PARAM,
  type HostDescriptor,
  type ServiceDescriptor,
  type UserDescriptor,
} from '../../../shared/url_state/flyout_v2_url_param';

export const ENTITY_ANALYTICS_FLYOUT_COPY_LINK_TEST_ID = 'entity-analytics-flyout-copy-link';

const COPY_LINK_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.copyEntityAnalyticsLink',
  { defaultMessage: 'Copy link to Entity Analytics' }
);

export type EntityAnalyticsFlyoutLinkTarget = HostDescriptor | UserDescriptor | ServiceDescriptor;

/** Search string that opens the Entity Analytics page with this entity flyout restored. */
export const buildEntityAnalyticsFlyoutSearch = (
  target: EntityAnalyticsFlyoutLinkTarget
): string => {
  const params = new URLSearchParams();
  params.set(FLYOUT_V2_URL_PARAM, encodeFlyoutV2UrlParam([toEntityFlyoutDescriptor(target)]));
  return `?${params.toString()}`;
};

const toEntityFlyoutDescriptor = (
  target: EntityAnalyticsFlyoutLinkTarget
): EntityAnalyticsFlyoutLinkTarget => {
  const identity = {
    ...(target.entityId ? { entityId: target.entityId } : {}),
    ...(target.scopeId ? { scopeId: target.scopeId } : {}),
  };

  switch (target.kind) {
    case 'host':
      return { kind: 'host', hostName: target.hostName, ...identity };
    case 'user':
      return { kind: 'user', userName: target.userName, ...identity };
    case 'service':
      return { kind: 'service', serviceName: target.serviceName, ...identity };
  }
};

export interface EntityAnalyticsFlyoutCopyLinkProps {
  target: EntityAnalyticsFlyoutLinkTarget;
}

/** Copies a URL to the Entity Analytics page with this flyout open */
export const EntityAnalyticsFlyoutCopyLink = ({ target }: EntityAnalyticsFlyoutCopyLinkProps) => {
  const isNewEntityAnalyticsPage = useNewEntityAnalyticsPage();
  const { getAppUrl } = useAppUrl();
  const url = useMemo(() => {
    if (!isNewEntityAnalyticsPage) {
      return null;
    }
    const appUrl = getAppUrl({
      deepLinkId: SecurityPageName.entityAnalyticsHomePage,
      path: buildEntityAnalyticsFlyoutSearch(target),
    });
    return `${window.location.origin}${appUrl}`;
  }, [getAppUrl, isNewEntityAnalyticsPage, target]);

  if (!isNewEntityAnalyticsPage) {
    return null;
  }

  return (
    <ShareUrlIconButton
      url={url}
      tooltip={COPY_LINK_LABEL}
      ariaLabel={COPY_LINK_LABEL}
      dataTestSubj={ENTITY_ANALYTICS_FLYOUT_COPY_LINK_TEST_ID}
    />
  );
};
