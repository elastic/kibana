/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment/moment';
import { IBasePath } from '@kbn/core-http-server';
import { getAlertDetailsUrl } from '@kbn/observability-plugin/common';
import {
  AlertInstanceContext as AlertContext,
  AlertInstanceState as AlertState,
  ActionGroupIdsOf,
} from '@kbn/alerting-plugin/server';
import { i18n } from '@kbn/i18n';
import { PublicAlertsClient } from '@kbn/alerting-plugin/server/alerts_client/types';
import { ObservabilityUptimeAlert } from '@kbn/alerts-as-data-utils';
import { ALERT_REASON, ALERT_UUID } from '@kbn/rule-data-utils';
import { TLSLatestPing } from './tls_rule_executor';
import { ALERT_DETAILS_URL } from '../action_variables';
import { Cert } from '../../../common/runtime_types';
import { tlsTranslations } from '../translations';
import { MonitorStatusActionGroup } from '../../../common/constants/synthetics_alerts';
import {
  CERT_COMMON_NAME,
  CERT_HASH_SHA256,
  CERT_ISSUER_NAME,
  CERT_VALID_NOT_AFTER,
  CERT_VALID_NOT_BEFORE,
  ERROR_MESSAGE,
  ERROR_STACK_TRACE,
  MONITOR_ID,
  MONITOR_NAME,
  MONITOR_TYPE,
  OBSERVER_GEO_NAME,
  OBSERVER_NAME,
  SERVICE_NAME,
  URL_FULL,
} from '../../../common/field_names';
import { generateAlertMessage } from '../common';
import { TlsTranslations } from '../../../common/rules/synthetics/translations';
interface TLSContent {
  summary: string;
  status?: string;
}

const getValidBefore = (notBefore?: string): TLSContent => {
  if (!notBefore) return { summary: 'Error, missing `certificate_not_valid_before` date.' };
  const relativeDate = moment().diff(notBefore, 'days');
  const formattedDate = moment(notBefore).format('MMM D, YYYY z');
  return relativeDate >= 0
    ? {
        summary: tlsTranslations.validBeforeExpiredString(formattedDate, relativeDate),
        status: tlsTranslations.agingLabel,
      }
    : {
        summary: tlsTranslations.validBeforeExpiringString(formattedDate, Math.abs(relativeDate)),
        status: tlsTranslations.invalidLabel,
      };
};
const getValidAfter = (notAfter?: string): TLSContent => {
  if (!notAfter) return { summary: 'Error, missing `certificate_not_valid_after` date.' };
  const relativeDate = moment().diff(notAfter, 'days');
  const formattedDate = moment(notAfter).format('MMM D, YYYY z');
  return relativeDate >= 0
    ? {
        summary: tlsTranslations.validAfterExpiredString(formattedDate, relativeDate),
        status: tlsTranslations.expiredLabel,
      }
    : {
        summary: tlsTranslations.validAfterExpiringString(formattedDate, Math.abs(relativeDate)),
        status: tlsTranslations.expiringLabel,
      };
};

export type CertSummary = ReturnType<typeof getCertSummary>;

export const getCertSummary = (cert: Cert, expirationThreshold: number, ageThreshold: number) => {
  const isExpiring = new Date(cert.not_after ?? '').valueOf() < expirationThreshold;
  const isAging = new Date(cert.not_before ?? '').valueOf() < ageThreshold;
  let content: TLSContent | null = null;

  if (isExpiring) {
    content = getValidAfter(cert.not_after);
  } else if (isAging) {
    content = getValidBefore(cert.not_before);
  }

  const { summary = '', status = '' } = content || {};
  return {
    summary,
    status,
    sha256: cert.sha256 ?? '',
    commonName: cert.common_name ?? '',
    issuer: cert.issuer ?? '',
    monitorName: cert.monitorName,
    monitorId: cert.configId,
    serviceName: cert.serviceName,
    monitorType: cert.monitorType,
    locationId: cert.locationId,
    locationName: cert.locationName,
    monitorUrl: cert.monitorUrl,
    configId: cert.configId,
    monitorTags: cert.tags,
    errorMessage: cert.errorMessage,
    errorStackTrace: cert.errorStackTrace,
    labels: cert.labels,
  };
};

export const getTLSAlertDocument = (cert: Cert, monitorSummary: CertSummary, uuid: string) => ({
  [CERT_COMMON_NAME]: cert.common_name,
  [CERT_ISSUER_NAME]: cert.issuer,
  [CERT_VALID_NOT_AFTER]: cert.not_after,
  [CERT_VALID_NOT_BEFORE]: cert.not_before,
  [CERT_HASH_SHA256]: cert.sha256,
  [ALERT_UUID]: uuid,
  [ALERT_REASON]: generateAlertMessage(TlsTranslations.defaultActionMessage, monitorSummary),
  [MONITOR_ID]: monitorSummary.monitorId,
  [MONITOR_TYPE]: monitorSummary.monitorType,
  [MONITOR_NAME]: monitorSummary.monitorName,
  [SERVICE_NAME]: monitorSummary.serviceName,
  [URL_FULL]: monitorSummary.monitorUrl,
  [OBSERVER_GEO_NAME]: monitorSummary.locationName ? [monitorSummary.locationName] : [],
  [OBSERVER_NAME]: monitorSummary.locationId ? [monitorSummary.locationId] : [],
  [ERROR_MESSAGE]: monitorSummary.errorMessage,
  // done to avoid assigning null to the field
  [ERROR_STACK_TRACE]: monitorSummary.errorStackTrace ? monitorSummary.errorStackTrace : undefined,
  'location.id': monitorSummary.locationId ? [monitorSummary.locationId] : [],
  'location.name': monitorSummary.locationName ? [monitorSummary.locationName] : [],
  labels: cert.labels,
  configId: monitorSummary.configId,
  'monitor.tags': monitorSummary.monitorTags ?? [],
});

export const setTLSRecoveredAlertsContext = async ({
  alertsClient,
  basePath,
  spaceId,
  latestPings,
}: {
  alertsClient: PublicAlertsClient<
    ObservabilityUptimeAlert,
    AlertState,
    AlertContext,
    ActionGroupIdsOf<MonitorStatusActionGroup>
  >;
  basePath: IBasePath;
  spaceId: string;
  latestPings: TLSLatestPing[];
}) => {
  const recoveredAlerts = alertsClient.getRecoveredAlerts() ?? [];

  for (const recoveredAlert of recoveredAlerts) {
    const recoveredAlertId = recoveredAlert.alert.getId();
    const alertUuid = recoveredAlert.alert.getUuid();

    const state = recoveredAlert.alert.getState();
    const alertUrl = await getAlertDetailsUrl(basePath, spaceId, alertUuid);

    const configId = state.configId;
    const latestPing = latestPings.find((ping) => ping.config_id === configId);

    const previousStatus = i18n.translate('xpack.synthetics.alerts.tls.previousStatus', {
      defaultMessage: 'Certificate {commonName} {summary}',
      values: { commonName: state.commonName, summary: state.summary },
    });

    const newCommonName = latestPing?.tls?.server?.x509?.subject.common_name ?? '';
    const newExpiryDate = latestPing?.tls?.server?.x509?.not_after ?? '';

    const { summary } = getValidAfter(newExpiryDate);

    let newStatus = i18n.translate('xpack.synthetics.alerts.tls.newStatus', {
      defaultMessage: 'Certificate {commonName} {summary}',
      values: { commonName: newCommonName, summary },
    });

    let newSummary = '';
    if (state.sha256 !== latestPing?.tls?.server?.hash?.sha256) {
      newSummary = i18n.translate('xpack.synthetics.alerts.tls.newSummary', {
        defaultMessage: 'Monitor certificate has been updated.',
      });
    }
    if (state.sha256 === latestPing?.tls?.server?.hash?.sha256 || !latestPing) {
      // in this case it seems like threshold has been changed, but the cert is the same
      newSummary = i18n.translate('xpack.synthetics.alerts.tls.newSummaryThreshold', {
        defaultMessage: 'Expiry/Age threshold has been updated.',
      });
      newStatus = previousStatus;
    }

    const context = {
      ...state,
      newStatus,
      previousStatus,
      summary: newSummary,
      [ALERT_DETAILS_URL]: alertUrl,
    };
    alertsClient.setAlertData({ id: recoveredAlertId, context });
  }
};
