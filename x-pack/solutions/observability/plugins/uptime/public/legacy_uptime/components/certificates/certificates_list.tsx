/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import type { Direction } from '@elastic/eui';
import { EuiBasicTable } from '@elastic/eui';
import { CertStatus } from './cert_status';
import { CertMonitors } from './cert_monitors';
import * as labels from './translations';
import type { Cert, CertMonitor, CertResult } from '../../../../common/runtime_types';
import { FingerprintCol } from './fingerprint_col';
import { LOADING_CERTIFICATES, NO_CERTS_AVAILABLE } from './translations';

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
  certificates: CertResult & { loading?: boolean };
}

export const CertificateList: React.FC<Props> = ({ page, certificates, sort, onChange }) => {
  const onTableChange = (newVal: Partial<Props>) => {
    onChange(newVal.page as Page, newVal.sort as CertSort);
  };

  const pagination = {
    pageIndex: page.index,
    pageSize: page.size,
    totalItemCount: certificates?.total ?? 0,
    pageSizeOptions: [10, 25, 50, 100],
    showPerPageOptions: true,
  };

  const columns = [
    {
      field: 'not_after',
      name: labels.STATUS_COL,
      sortable: true,
      render: (val: string, item: Cert) => <CertStatus cert={item} />,
    },
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
      render: (value: string) => moment(value).format('L LT'),
    },
    {
      name: labels.AGE_COL,
      field: 'not_before',
      sortable: true,
      render: (value: string) => moment().diff(moment(value), 'days') + ' ' + labels.DAYS,
    },
    {
      name: labels.FINGERPRINTS_COL,
      field: 'sha256',
      render: (val: string, item: Cert) => <FingerprintCol cert={item} />,
    },
  ];

  return (
    <EuiBasicTable
      data-test-subj="uptimeCertificatesTable"
      loading={certificates.loading}
      columns={columns}
      items={certificates?.certs ?? []}
      pagination={pagination}
      onChange={onTableChange}
      sorting={{
        sort: {
          field: sort.field,
          direction: sort.direction,
        },
      }}
      tableCaption={i18n.translate('xpack.uptime.certificatesList.caption', {
        defaultMessage: 'Certificates overview',
      })}
      noItemsMessage={certificates.loading ? LOADING_CERTIFICATES : NO_CERTS_AVAILABLE}
    />
  );
};
