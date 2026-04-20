/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { EVENT_CATEGORY_FIELD, getFieldValue } from '@kbn/discover-utils';
import { ALERT_RULE_NAME, EVENT_KIND } from '@kbn/rule-data-utils';
import { i18n } from '@kbn/i18n';
import { startCase } from 'lodash';
import { EventKind } from '../constants/event_kinds';

const DEFAULT_DOCUMENT_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.document.header.title',
  { defaultMessage: 'Document details' }
);

const DEFAULT_EVENT_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.document.title.eventTitle',
  {
    defaultMessage: 'Event details',
  }
);

const EXTERNAL_ALERT_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.document.title.alertTitle',
  {
    defaultMessage: 'External alert details',
  }
);

/**
 * Mapping of event.category to the field used as the document title
 */
export const EVENT_CATEGORY_TO_FIELD: Record<string, string> = {
  authentication: 'user.name',
  configuration: '',
  database: '',
  driver: '',
  email: '',
  file: 'file.name',
  host: 'host.name',
  iam: '',
  intrusion_detection: '',
  malware: '',
  network: '',
  package: '',
  process: 'process.name',
  registry: '',
  session: '',
  threat: '',
  vulnerability: '',
  web: '',
};

export type FieldAccessor = (fieldName: string) => string | undefined;

/**
 * Returns the alert title based on the rule name, or a default title.
 */
export const getAlertTitle = (ruleName?: string | null): string => {
  return ruleName ?? DEFAULT_DOCUMENT_TITLE;
};

/**
 * Returns a human-readable title for an event based on its event.kind and event.category fields.
 * Uses a generic field accessor to look up the mapped field value.
 */
export const getEventTitle = (
  eventKind: string | null | undefined,
  eventCategory: string | null | undefined,
  getField: FieldAccessor
): string => {
  if (eventKind === EventKind.event && eventCategory) {
    const fieldName = EVENT_CATEGORY_TO_FIELD[eventCategory];
    if (fieldName) {
      return getField(fieldName) ?? DEFAULT_EVENT_TITLE;
    }
    return DEFAULT_EVENT_TITLE;
  }

  if (eventKind === EventKind.alert) {
    return EXTERNAL_ALERT_TITLE;
  }

  return eventKind
    ? i18n.translate('xpack.securitySolution.flyout.document.title.otherEventTitle', {
        defaultMessage: '{eventKind} details',
        values: { eventKind: startCase(eventKind) },
      })
    : DEFAULT_EVENT_TITLE;
};

/**
 * Returns a human-readable title for a document based on its event.kind and event.category fields.
 * Convenience wrapper for flyout_v2 consumers that takes a DataTableRecord.
 */
export const getDocumentTitle = (hit: DataTableRecord): string => {
  const eventKind = getFieldValue(hit, EVENT_KIND) as string | undefined;

  // Security alert (signal): use rule name
  if (eventKind === EventKind.signal) {
    const ruleName = getFieldValue(hit, ALERT_RULE_NAME) as string | undefined;
    return getAlertTitle(ruleName);
  }

  const eventCategory = getFieldValue(hit, EVENT_CATEGORY_FIELD) as string | undefined;
  return getEventTitle(
    eventKind,
    eventCategory,
    (fieldName) => getFieldValue(hit, fieldName) as string | undefined
  );
};
