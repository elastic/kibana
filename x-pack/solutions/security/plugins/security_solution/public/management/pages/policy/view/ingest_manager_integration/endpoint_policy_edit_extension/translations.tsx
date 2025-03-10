/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export const BLOCKLISTS_LABELS = {
  artifactsSummaryApiError: (error: string) =>
    i18n.translate('xpack.securitySolution.endpoint.fleetIntegrationCard.blocklistsSummary.error', {
      defaultMessage: 'There was an error trying to fetch blocklist stats: "{error}"',
      values: { error },
    }),
  cardTitle: (
    <FormattedMessage
      id="xpack.securitySolution.endpoint.blocklist.fleetIntegration.title"
      defaultMessage="Blocklist"
    />
  ),
  linkLabel: (
    <FormattedMessage
      id="xpack.securitySolution.endpoint.fleetIntegrationCard.blocklistsManageLabel"
      defaultMessage="Manage blocklist"
    />
  ),
};
export const HOST_ISOLATION_EXCEPTIONS_LABELS = {
  artifactsSummaryApiError: (error: string) =>
    i18n.translate(
      'xpack.securitySolution.endpoint.fleetIntegrationCard.hostIsolationExceptionsSummary.error',
      {
        defaultMessage:
          'There was an error trying to fetch host isolation exceptions stats: "{error}"',
        values: { error },
      }
    ),
  cardTitle: (
    <FormattedMessage
      id="xpack.securitySolution.endpoint.hostIsolationExceptions.fleetIntegration.title"
      defaultMessage="Host isolation exceptions"
    />
  ),
  linkLabel: (
    <FormattedMessage
      id="xpack.securitySolution.endpoint.fleetIntegrationCard.hostIsolationExceptionsManageLabel"
      defaultMessage="Manage host isolation exceptions"
    />
  ),
};
export const EVENT_FILTERS_LABELS = {
  artifactsSummaryApiError: (error: string) =>
    i18n.translate(
      'xpack.securitySolution.endpoint.fleetIntegrationCard.eventFiltersSummary.error',
      {
        defaultMessage: 'There was an error trying to fetch event filters stats: "{error}"',
        values: { error },
      }
    ),
  cardTitle: (
    <FormattedMessage
      id="xpack.securitySolution.endpoint.eventFilters.fleetIntegration.title"
      defaultMessage="Event filters"
    />
  ),
  linkLabel: (
    <FormattedMessage
      id="xpack.securitySolution.endpoint.fleetIntegrationCard.eventFiltersManageLabel"
      defaultMessage="Manage event filters"
    />
  ),
};
export const TRUSTED_APPS_LABELS = {
  artifactsSummaryApiError: (error: string) =>
    i18n.translate(
      'xpack.securitySolution.endpoint.fleetIntegrationCard.trustedAppsSummary.error',
      {
        defaultMessage: 'There was an error trying to fetch trusted apps stats: "{error}"',
        values: { error },
      }
    ),
  cardTitle: (
    <FormattedMessage
      id="xpack.securitySolution.endpoint.trustedApps.fleetIntegration.title"
      defaultMessage="Trusted applications"
    />
  ),
  linkLabel: (
    <FormattedMessage
      id="xpack.securitySolution.endpoint.fleetIntegrationCard.trustedAppsManageLabel"
      defaultMessage="Manage trusted applications"
    />
  ),
};
