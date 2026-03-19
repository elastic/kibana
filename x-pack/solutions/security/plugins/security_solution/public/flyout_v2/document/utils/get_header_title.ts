/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { ALERT_RULE_NAME, EVENT_KIND } from '@kbn/rule-data-utils';
import { i18n } from '@kbn/i18n';
import { startCase } from 'lodash';
import { EventKind } from '../../../flyout/document_details/shared/constants/event_kinds';

const DEFAULT_DOCUMENT_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.right.header.headerTitle',
  { defaultMessage: 'Document details' }
);

const DEFAULT_EVENT_TITLE = i18n.translate('xpack.securitySolution.flyout.title.eventTitle', {
  defaultMessage: 'Event details',
});

const EXTERNAL_ALERT_TITLE = i18n.translate('xpack.securitySolution.flyout.title.alertEventTitle', {
  defaultMessage: 'External alert details',
});

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

/**
 * Returns a human-readable title for a document based on its event.kind and event.category fields.
 * - For signals (alerts): returns the rule name or a default title
 * - For events with a known category: returns the value of the mapped field
 * - For external alerts: returns "External alert details"
 * - For other event kinds: returns "{eventKind} details"
 * - Fallback: "Event details"
 */
export const getDocumentTitle = (hit: DataTableRecord): string => {
  const eventKind = getFieldValue(hit, EVENT_KIND) as string | undefined;

  // Security alert (signal): use rule name
  if (eventKind === EventKind.signal) {
    const ruleName = getFieldValue(hit, ALERT_RULE_NAME) as string | undefined;
    return ruleName ?? DEFAULT_DOCUMENT_TITLE;
  }

  // Event with known category: use mapped field value
  if (eventKind === EventKind.event) {
    const eventCategory = getFieldValue(hit, 'event.category') as string | undefined;
    if (eventCategory) {
      const fieldName = EVENT_CATEGORY_TO_FIELD[eventCategory];
      if (fieldName) {
        return (getFieldValue(hit, fieldName) as string) ?? DEFAULT_EVENT_TITLE;
      }
    }
    return DEFAULT_EVENT_TITLE;
  }

  // External alert
  if (eventKind === EventKind.alert) {
    return EXTERNAL_ALERT_TITLE;
  }

  // Other event kinds (e.g. "metric", "state", etc.)
  if (eventKind) {
    return i18n.translate('xpack.securitySolution.flyout.title.otherEventTitle', {
      defaultMessage: '{eventKind} details',
      values: { eventKind: startCase(eventKind) },
    });
  }

  return DEFAULT_EVENT_TITLE;
};
