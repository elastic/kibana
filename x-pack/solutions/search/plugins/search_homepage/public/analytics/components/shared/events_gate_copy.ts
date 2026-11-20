/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** The heading of the ingest gate for a user who asked for event analytics. */
export const getEventsGateTitle = (): string =>
  i18n.translate('xpack.searchHomepage.analytics.eventsGate.title', {
    defaultMessage: 'Add your events',
  });

export const getEventsGateDescription = (): string =>
  i18n.translate('xpack.searchHomepage.analytics.eventsGate.description', {
    defaultMessage:
      'Analyze clickstreams, product telemetry, game events and payments with ES|QL and dashboards.',
  });
