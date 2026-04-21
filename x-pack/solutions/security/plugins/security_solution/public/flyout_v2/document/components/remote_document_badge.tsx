/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { EuiBadge, EuiSpacer } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { isCCSRemoteIndexName } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { ALERT_RULE_TYPE_ID, EVENT_KIND } from '@kbn/rule-data-utils';
import {
  ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
  ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
} from '@kbn/elastic-assistant-common';
import { EventKind } from '../constants/event_kinds';
import { useKibana } from '../../../common/lib/kibana';

export const REMOTE_DOCUMENT_BADGE_TEST_ID = 'remoteDocumentBadge';

const ATTACK_DISCOVERY_RULE_TYPES = new Set<string>([
  ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
  ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
]);

const REMOTE_ATTACK_BADGE_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.document.components.remoteDocumentBadge.remoteAttackLabel',
  { defaultMessage: 'Remote attack' }
);

const REMOTE_ALERT_BADGE_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.document.components.remoteDocumentBadge.remoteAlertLabel',
  { defaultMessage: 'Remote alert' }
);

const REMOTE_EVENT_BADGE_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.document.components.remoteDocumentBadge.remoteEventLabel',
  { defaultMessage: 'Remote event' }
);

const LINKED_PROJECT_ATTACK_BADGE_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.document.components.remoteDocumentBadge.linkedProjectAttackLabel',
  { defaultMessage: 'Linked project attack' }
);

const LINKED_PROJECT_ALERT_BADGE_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.document.components.remoteDocumentBadge.linkedProjectAlertLabel',
  { defaultMessage: 'Linked project alert' }
);

const LINKED_PROJECT_EVENT_BADGE_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.document.components.remoteDocumentBadge.linkedProjectEventLabel',
  { defaultMessage: 'Linked project event' }
);

export interface RemoteDocumentBadgeProps {
  /**
   * The document record used to determine whether it originates from a remote cluster
   * and whether it is an alert or an event.
   */
  hit: DataTableRecord;
}

/**
 * Renders a badge when the document originates from a remote (CCS) cluster, otherwise null.
 * Displays "Remote alert" for signals and "Remote event" for all other document kinds.
 */
export const RemoteDocumentBadge: FC<RemoteDocumentBadgeProps> = ({ hit }) => {
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

  if (!isCCSRemoteIndexName(index)) {
    return null;
  }

  const label = isServerless
    ? isAttack
      ? LINKED_PROJECT_ATTACK_BADGE_LABEL
      : isAlert
      ? LINKED_PROJECT_ALERT_BADGE_LABEL
      : LINKED_PROJECT_EVENT_BADGE_LABEL
    : isAttack
    ? REMOTE_ATTACK_BADGE_LABEL
    : isAlert
    ? REMOTE_ALERT_BADGE_LABEL
    : REMOTE_EVENT_BADGE_LABEL;

  return (
    <>
      <EuiSpacer size="xs" />
      <EuiBadge color="hollow" data-test-subj={REMOTE_DOCUMENT_BADGE_TEST_ID}>
        {label}
      </EuiBadge>
    </>
  );
};

RemoteDocumentBadge.displayName = 'RemoteDocumentBadge';
