/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { ActionableBadge, type MultiValueCellAction } from '@kbn/cloud-security-posture';

const OPEN_IN_DISCOVER_LABEL = i18n.translate(
  'xpack.alertzero.agentBuilder.attachments.shared.iocBadgeOpenInDiscover',
  { defaultMessage: 'Open in Discover' }
);

const OPEN_ENTITY_PAGE_LABEL = i18n.translate(
  'xpack.alertzero.agentBuilder.attachments.shared.iocBadgeOpenEntityPage',
  { defaultMessage: 'Open entity page' }
);

const OPEN_ALERT_DETAILS_LABEL = i18n.translate(
  'xpack.alertzero.agentBuilder.attachments.shared.iocBadgeOpenAlertDetails',
  { defaultMessage: 'Open alert details' }
);

export interface IocBadgeProps {
  value: string;
  index: number;
  discoverHref?: string;
  /**
   * When set, takes priority over `discoverHref`: renders a distinct
   * "Open entity page" action (Security host/user pages aren't Discover).
   */
  entityPageHref?: string;
  /**
   * When set, takes priority over both `entityPageHref` and `discoverHref`:
   * renders a distinct "Open alert details" action (the Security alert
   * flyout redirect isn't Discover either).
   */
  alertDetailsHref?: string;
  testSubj?: string;
}

/**
 * `ActionableBadge` wrapper for a single queryable value (IOC, report id,
 * run id, event id, alert id, related entity/report id): always offers a
 * copy action on hover, plus an "Open in Discover", "Open entity page", or
 * "Open alert details" action when a href is available. Wrapped in a
 * `<span>` carrying `testSubj` so existing per-value link test ids survive
 * the swap from a custom `EuiBadge` / `DiscoverLink`.
 */
export const IocBadge: React.FC<IocBadgeProps> = ({
  value,
  index,
  discoverHref,
  entityPageHref,
  alertDetailsHref,
  testSubj,
}) => {
  const actions: MultiValueCellAction[] = alertDetailsHref
    ? [
        {
          iconType: 'securitySignalDetected',
          ariaLabel: OPEN_ALERT_DETAILS_LABEL,
          title: OPEN_ALERT_DETAILS_LABEL,
          onClick: () => window.open(alertDetailsHref, '_blank', 'noopener,noreferrer'),
        },
      ]
    : entityPageHref
    ? [
        {
          iconType: 'user',
          ariaLabel: OPEN_ENTITY_PAGE_LABEL,
          title: OPEN_ENTITY_PAGE_LABEL,
          onClick: () => window.open(entityPageHref, '_blank', 'noopener,noreferrer'),
        },
      ]
    : discoverHref
    ? [
        {
          iconType: 'discoverApp',
          ariaLabel: OPEN_IN_DISCOVER_LABEL,
          title: OPEN_IN_DISCOVER_LABEL,
          onClick: () => window.open(discoverHref, '_blank', 'noopener,noreferrer'),
        },
      ]
    : [];

  return (
    <span data-test-subj={testSubj}>
      <ActionableBadge item={value} index={index} actions={actions} />
    </span>
  );
};
