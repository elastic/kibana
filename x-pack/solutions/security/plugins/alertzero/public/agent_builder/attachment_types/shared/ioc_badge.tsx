/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { ActionableBadge, type MultiValueCellAction } from '@kbn/cloud-security-posture';

export const OPEN_IN_DISCOVER_LABEL = i18n.translate(
  'xpack.alertzero.agentBuilder.attachments.shared.iocBadgeOpenInDiscover',
  { defaultMessage: 'Open in Discover' }
);

export const OPEN_ENTITY_PAGE_LABEL = i18n.translate(
  'xpack.alertzero.agentBuilder.attachments.shared.iocBadgeOpenEntityPage',
  { defaultMessage: 'Open entity page' }
);

export const OPEN_ALERT_DETAILS_LABEL = i18n.translate(
  'xpack.alertzero.agentBuilder.attachments.shared.iocBadgeOpenAlertDetails',
  { defaultMessage: 'Open alert details' }
);

export interface IocBadgeAction {
  href: string;
  iconType: string;
  label: string;
}

export interface IocBadgeProps {
  value: string;
  index?: number;
  /** The single hover action to offer (Open in Discover, Open entity page, Open alert details). */
  action?: IocBadgeAction;
  testSubj?: string;
}

/**
 * `ActionableBadge` wrapper for a single queryable value (IOC, report id, run id, event id,
 * alert id, related entity/report id): always offers a copy action on hover, plus a caller-
 * supplied action (e.g. "Open in Discover") when one is available. Wrapped in a `<span>`
 * carrying `testSubj` so per-value link test ids survive.
 */
export const IocBadge: React.FC<IocBadgeProps> = ({ value, index = 0, action, testSubj }) => {
  const actions: MultiValueCellAction[] = action
    ? [
        {
          iconType: action.iconType,
          ariaLabel: action.label,
          title: action.label,
          onClick: () => window.open(action.href, '_blank', 'noopener,noreferrer'),
        },
      ]
    : [];

  return (
    <span data-test-subj={testSubj}>
      <ActionableBadge item={value} index={index} actions={actions} />
    </span>
  );
};
