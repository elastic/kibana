/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactNode } from 'react';
import React, { useMemo } from 'react';
import type { EuiCallOutProps } from '@elastic/eui';
import { EuiCallOut } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { isNonLocalIndexName } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { ALERT_RULE_TYPE_ID, EVENT_KIND } from '@kbn/rule-data-utils';
import {
  ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
  ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
} from '@kbn/elastic-assistant-common';
import { EventKind } from '../constants/event_kinds';
import { useKibana } from '../../../../common/lib/kibana';

const ATTACK_DISCOVERY_RULE_TYPES = new Set<string>([
  ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
  ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
]);

const REMOTE_ATTACK_CALLOUT = i18n.translate(
  'xpack.securitySolution.flyout.document.components.remoteDocumentCallout.remoteAttackMessage',
  {
    defaultMessage:
      'This attack originates from a remote cluster. Some features may not be available.',
  }
);

const REMOTE_ALERT_CALLOUT = i18n.translate(
  'xpack.securitySolution.flyout.document.components.remoteDocumentCallout.remoteAlertMessage',
  {
    defaultMessage:
      'This alert originates from a remote cluster. Some features may not be available.',
  }
);

const REMOTE_EVENT_CALLOUT = i18n.translate(
  'xpack.securitySolution.flyout.document.components.remoteDocumentCallout.remoteEventMessage',
  {
    defaultMessage:
      'This event originates from a remote cluster. Some features may not be available.',
  }
);

const LINKED_PROJECT_ATTACK_CALLOUT = i18n.translate(
  'xpack.securitySolution.flyout.document.components.remoteDocumentCallout.linkedProjectAttackMessage',
  {
    defaultMessage:
      'This attack originates from a linked project. Some features may not be available.',
  }
);

const LINKED_PROJECT_ALERT_CALLOUT = i18n.translate(
  'xpack.securitySolution.flyout.document.components.remoteDocumentCallout.linkedProjectAlertMessage',
  {
    defaultMessage:
      'This alert originates from a linked project. Some features may not be available.',
  }
);

const LINKED_PROJECT_EVENT_CALLOUT = i18n.translate(
  'xpack.securitySolution.flyout.document.components.remoteDocumentCallout.linkedProjectEventMessage',
  {
    defaultMessage:
      'This event originates from a linked project. Some features may not be available.',
  }
);

export interface RemoteDocumentCalloutProps extends Pick<EuiCallOutProps, 'css'> {
  /**
   * The document record used to determine whether it originates from a remote cluster.
   */
  hit: DataTableRecord;
  /**
   * Optional content rendered after the callout, only when the callout is shown.
   * Use this to inject a spacer when the callout is rendered inside a padded body area.
   */
  children?: ReactNode;
}

/**
 * Renders a callout when the document originates from a remote (CCS) cluster, otherwise null.
 * Any children are rendered after the callout and are suppressed when the document is local.
 */
export const RemoteDocumentCallout: FC<RemoteDocumentCalloutProps> = ({ hit, children }) => {
  const { services } = useKibana();
  const isServerless = services.cloud?.isServerlessEnabled ?? false;
  const index = useMemo(
    () => hit.raw._index ?? (getFieldValue(hit, '_index') as string) ?? '',
    [hit]
  );
  const isAlert = useMemo(
    () => (getFieldValue(hit, EVENT_KIND) as string) === EventKind.signal,
    [hit]
  );
  const isAttack = useMemo(
    () =>
      isAlert && ATTACK_DISCOVERY_RULE_TYPES.has(getFieldValue(hit, ALERT_RULE_TYPE_ID) as string),
    [hit, isAlert]
  );

  if (!isNonLocalIndexName(index)) {
    return null;
  }

  const message = isServerless
    ? isAttack
      ? LINKED_PROJECT_ATTACK_CALLOUT
      : isAlert
      ? LINKED_PROJECT_ALERT_CALLOUT
      : LINKED_PROJECT_EVENT_CALLOUT
    : isAttack
    ? REMOTE_ATTACK_CALLOUT
    : isAlert
    ? REMOTE_ALERT_CALLOUT
    : REMOTE_EVENT_CALLOUT;

  return (
    <>
      <EuiCallOut announceOnMount size="s" title={message} />
      {children}
    </>
  );
};

RemoteDocumentCallout.displayName = 'RemoteDocumentCallout';
