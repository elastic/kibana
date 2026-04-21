/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactNode } from 'react';
import React, { useMemo } from 'react';
import { EuiCallOut } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { isCCSRemoteIndexName } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { ALERT_RULE_TYPE_ID, EVENT_KIND } from '@kbn/rule-data-utils';
import {
  ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
  ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
} from '@kbn/elastic-assistant-common';
import { useKibana } from '../../../common/lib/kibana';
import { EventKind } from '../../document/constants/event_kinds';

const ATTACK_DISCOVERY_RULE_TYPES = new Set<string>([
  ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
  ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
]);

export const REMOTE_CLUSTER_NOTES_MESSAGE = i18n.translate(
  'xpack.securitySolution.flyout.notes.remoteClusterNotesMessage',
  {
    defaultMessage:
      'Notes for this alert are only available in the local cluster. You can view and add notes locally only.',
  }
);

export const LINKED_PROJECT_NOTES_MESSAGE = i18n.translate(
  'xpack.securitySolution.flyout.notes.linkedProjectNotesMessage',
  {
    defaultMessage:
      'Notes for this alert are only available in this project. You can view and add notes locally only.',
  }
);

export const REMOTE_CLUSTER_EVENT_NOTES_MESSAGE = i18n.translate(
  'xpack.securitySolution.flyout.notes.remoteClusterEventNotesMessage',
  {
    defaultMessage:
      'Notes for this event are only available in the local cluster. You can view and add notes locally only.',
  }
);

export const LINKED_PROJECT_EVENT_NOTES_MESSAGE = i18n.translate(
  'xpack.securitySolution.flyout.notes.linkedProjectEventNotesMessage',
  {
    defaultMessage:
      'Notes for this event are only available in this project. You can view and add notes locally only.',
  }
);

export const REMOTE_CLUSTER_ATTACK_NOTES_MESSAGE = i18n.translate(
  'xpack.securitySolution.flyout.notes.remoteClusterAttackNotesMessage',
  {
    defaultMessage:
      'Notes for this attack are only available in the local cluster. You can view and add notes locally only.',
  }
);

export const LINKED_PROJECT_ATTACK_NOTES_MESSAGE = i18n.translate(
  'xpack.securitySolution.flyout.notes.linkedProjectAttackNotesMessage',
  {
    defaultMessage:
      'Notes for this attack are only available in this project. You can view and add notes locally only.',
  }
);

export interface NotesRemoteCalloutProps {
  /**
   * The document record used to determine whether it originates from a remote cluster/project
   * and whether it is an alert or an event.
   */
  hit: DataTableRecord;
  /**
   * Optional content rendered after the callout, only when the callout is shown.
   * Use this to inject a spacer when the callout is rendered inside a padded body area.
   */
  children?: ReactNode;
}

/**
 * Renders an informational callout when the document originates from a remote (CCS/CPS) index,
 * otherwise null. Shows alert- or event-specific wording, and adapts to serverless (CPS) vs
 * on-prem (CCS) deployments.
 */
export const NotesRemoteCallout: FC<NotesRemoteCalloutProps> = ({ children, hit }) => {
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

  const message = isServerless
    ? isAttack
      ? LINKED_PROJECT_ATTACK_NOTES_MESSAGE
      : isAlert
      ? LINKED_PROJECT_NOTES_MESSAGE
      : LINKED_PROJECT_EVENT_NOTES_MESSAGE
    : isAttack
    ? REMOTE_CLUSTER_ATTACK_NOTES_MESSAGE
    : isAlert
    ? REMOTE_CLUSTER_NOTES_MESSAGE
    : REMOTE_CLUSTER_EVENT_NOTES_MESSAGE;

  return (
    <>
      <EuiCallOut announceOnMount size="s" title={message} />
      {children}
    </>
  );
};

NotesRemoteCallout.displayName = 'NotesRemoteCallout';
