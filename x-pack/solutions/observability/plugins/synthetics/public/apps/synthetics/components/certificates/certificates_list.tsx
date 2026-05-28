/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import rison from '@kbn/rison';
import type { Direction } from '@elastic/eui';
import { EuiBasicTable, EuiHealth, EuiLink, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Cert, CertMonitor, CertResult } from '../../../../../common/runtime_types';
import { useDateFormat } from '../../../../hooks/use_date_format';
import type { CertAlertInfo } from './use_fetch_cert_alerts';
import { useSyntheticsSettingsContext } from '../../contexts';
import { CertMonitors } from './cert_monitors';
import * as labels from './translations';
import { FingerprintCol } from './fingerprint_col';
import {
  LOADING_CERTIFICATES,
  NO_CERTS_AVAILABLE,
  COMPUTED_STATUS_OK_TOOLTIP,
  computedStatusRiskTooltip,
} from './translations';

interface Page {
  index: number;
  size: number;
}

export type CertFields =
  | 'monitorName'
  | 'locationName'
  | 'monitorType'
  | 'monitorUrl'
  | 'sha256'
  | 'sha1'
  | 'issuer'
  | 'common_name'
  | 'monitors'
  | 'not_after'
  | 'not_before';

export interface CertSort {
  field: CertFields;
  direction: Direction;
}

interface Props {
  page: Page;
  sort: CertSort;
  onChange: (page: Page, sort: CertSort) => void;
  certificates: CertResult & { isLoading?: boolean };
  alertsByCert?: Map<string, CertAlertInfo>;
  certExpirationThreshold: number;
  certAgeThreshold: number;
}

const useCertAlertsUrl = (sha256: string) => {
  const { basePath } = useSyntheticsSettingsContext();
  const kuery = `kibana.alert.rule.rule_type_id : "xpack.synthetics.alerts.tls" AND tls.server.hash.sha256 : "${sha256}"`;
  return `${basePath}/app/observability/alerts?_a=${rison.encode({
    kuery,
    status: 'active',
    rangeFrom: 'now-30d',
    rangeTo: 'now',
  })}`;
};

const ALERT_STATUS_DISPLAY: Record<string, { label: string; color: 'danger' | 'warning' }> = {
  expired: { label: labels.EXPIRED, color: 'danger' },
  expiring: { label: labels.EXPIRES_SOON, color: 'warning' },
  aging: { label: labels.TOO_OLD, color: 'warning' },
  unknown: { label: labels.EXPIRES_SOON, color: 'warning' },
};

type ComputedCertStatus = 'ok' | 'expired' | 'expiring' | 'aging';

const computeCertStatus = (
  cert: Cert,
  expirationThreshold: number,
  ageThreshold: number
): ComputedCertStatus => {
  const { not_after: notAfter, not_before: notBefore } = cert;
  if (!notAfter) return 'ok';

  const now = moment();
  if (moment(notAfter).isBefore(now)) return 'expired';
  if (moment(notAfter).diff(now, 'days') < expirationThreshold) return 'expiring';
  if (notBefore && now.diff(moment(notBefore), 'days') > ageThreshold) return 'aging';
  return 'ok';
};

const COMPUTED_STATUS_DISPLAY: Record<
  ComputedCertStatus,
  { label: string; color: 'success' | 'danger' | 'warning' }
> = {
  ok: { label: labels.OK, color: 'success' },
  expired: { label: labels.EXPIRED, color: 'danger' },
  expiring: { label: labels.EXPIRES_SOON, color: 'warning' },
  aging: { label: labels.TOO_OLD, color: 'warning' },
};

const CertAlertsBadge: React.FC<{
  cert: Cert;
  alertsByCert?: Map<string, CertAlertInfo>;
  certExpirationThreshold: number;
  certAgeThreshold: number;
}> = ({ cert, alertsByCert, certExpirationThreshold, certAgeThreshold }) => {
  const alertsUrl = useCertAlertsUrl(cert.sha256);
  const alertInfo = alertsByCert?.get(cert.sha256);

  if (alertInfo) {
    const { count, status } = alertInfo;
    const display = ALERT_STATUS_DISPLAY[status];
    return (
      <EuiToolTip
        content={i18n.translate('xpack.synthetics.certs.list.activeAlertsTooltip', {
          defaultMessage:
            '{count, plural, one {# active TLS alert} other {# active TLS alerts}} for this certificate',
          values: { count },
        })}
      >
        <EuiLink href={alertsUrl}>
          <EuiHealth color={display.color}>{display.label}</EuiHealth>
        </EuiLink>
      </EuiToolTip>
    );
  }

  const computed = computeCertStatus(cert, certExpirationThreshold, certAgeThreshold);
  const display = COMPUTED_STATUS_DISPLAY[computed];
  const tooltip =
    computed === 'ok'
      ? COMPUTED_STATUS_OK_TOOLTIP
      : computedStatusRiskTooltip(certExpirationThreshold, certAgeThreshold);

  return (
    <EuiToolTip content={tooltip}>
      <EuiHealth color={display.color}>{display.label}</EuiHealth>
    </EuiToolTip>
  );
};

export const CertificateList: React.FC<Props> = ({
  page,
  certificates,
  sort,
  onChange,
  alertsByCert,
  certExpirationThreshold,
  certAgeThreshold,
}) => {
  const dateFormatter = useDateFormat();
  const pagination = {
    pageIndex: page.index,
    pageSize: page.size,
    totalItemCount: certificates?.total ?? 0,
    pageSizeOptions: [10, 25, 50, 100],
    showPerPageOptions: true,
  };

  const columns = [
    {
      name: labels.COMMON_NAME_COL,
      field: 'common_name',
      sortable: true,
    },
    {
      name: labels.MONITORS_COL,
      field: 'monitors',
      render: (monitors: CertMonitor[]) => <CertMonitors monitors={monitors} />,
    },
    {
      name: labels.ISSUED_BY_COL,
      field: 'issuer',
      sortable: true,
    },
    {
      name: labels.VALID_UNTIL_COL,
      field: 'not_after',
      sortable: true,
      render: dateFormatter,
    },
    {
      name: labels.AGE_COL,
      field: 'not_before',
      sortable: true,
      render: (value: string) => moment().diff(moment(value), 'days') + ' ' + labels.DAYS,
    },
    {
      name: labels.ALERTS_COL,
      field: 'sha256',
      render: (_sha256: string, cert: Cert) => (
        <CertAlertsBadge
          cert={cert}
          alertsByCert={alertsByCert}
          certExpirationThreshold={certExpirationThreshold}
          certAgeThreshold={certAgeThreshold}
        />
      ),
    },
    {
      name: labels.FINGERPRINTS_COL,
      field: 'sha256',
      render: (val: string, item: Cert) => <FingerprintCol cert={item} />,
    },
  ];

  return (
    <EuiBasicTable
      loading={certificates.isLoading}
      columns={columns}
      items={certificates?.certs ?? []}
      pagination={pagination}
      tableCaption={i18n.translate('xpack.synthetics.certificates.certificatesList.tableCaption', {
        defaultMessage: 'Certificates overview',
      })}
      onChange={(newVal) => {
        onChange(newVal.page as Page, newVal.sort as CertSort);
      }}
      sorting={{
        sort: {
          field: sort.field,
          direction: sort.direction,
        },
      }}
      noItemsMessage={certificates.isLoading ? LOADING_CERTIFICATES : NO_CERTS_AVAILABLE}
    />
  );
};
