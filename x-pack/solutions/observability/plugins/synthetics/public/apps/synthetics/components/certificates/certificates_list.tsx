/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useState } from 'react';
import type { Direction } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiI18nNumber,
  EuiPanel,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Cert, CertMonitor, CertResult } from '../../../../../common/runtime_types';
import { useDateFormat } from '../../../../hooks/use_date_format';
import { CertStatus } from './cert_status';
import { CertMonitors } from './cert_monitors';
import { CertMonitorTypes } from './cert_monitor_types';
import * as labels from './translations';
import { FingerprintCol } from './fingerprint_col';
import { LOADING_CERTIFICATES, NO_CERTS_AVAILABLE } from './translations';

interface Page {
  index: number;
  size: number;
}

// Stable identity for expandable-row tracking. A cert has no single indexed id
// for browser monitors (no fingerprint), so we combine the dedupe key fields.
const getCertId = (cert: Cert): string =>
  `${cert.common_name ?? ''}::${cert.sha256 ?? ''}::${cert.not_after ?? ''}`;

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
}

export const CertificateList: React.FC<Props> = ({ page, certificates, sort, onChange }) => {
  const dateFormatter = useDateFormat();
  const total = certificates?.total ?? 0;
  const [expandedRows, setExpandedRows] = useState<Record<string, ReactNode>>({});

  const pagination = {
    pageIndex: page.index,
    pageSize: page.size,
    totalItemCount: total,
    pageSizeOptions: [10, 25, 50, 100],
    showPerPageOptions: true,
  };

  const rangeStart = total === 0 ? 0 : page.size * page.index + 1;
  const rangeEnd = Math.min(page.size * page.index + page.size, total);

  const toggleDetails = (cert: Cert) => {
    const id = getCertId(cert);
    setExpandedRows((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = (
          <EuiDescriptionList
            compressed
            type="column"
            listItems={[
              {
                title: labels.FINGERPRINTS_COL,
                description: <FingerprintCol cert={cert} />,
              },
            ]}
          />
        );
      }
      return next;
    });
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
      render: (commonName: string, item: Cert) => (
        <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{commonName}</EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <CertMonitorTypes cert={item} />
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
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
      name: labels.ISSUED_ON_COL,
      field: 'not_before',
      sortable: true,
      render: dateFormatter,
    },
    {
      align: 'right' as const,
      width: '40px',
      isExpander: true,
      render: (item: Cert) => {
        const isExpanded = Boolean(expandedRows[getCertId(item)]);
        return (
          <EuiToolTip
            content={isExpanded ? labels.COLLAPSE_CERT_DETAILS : labels.EXPAND_CERT_DETAILS}
            disableScreenReaderOutput
          >
            <EuiButtonIcon
              data-test-subj="certExpandDetailsButton"
              onClick={() => toggleDetails(item)}
              aria-label={isExpanded ? labels.COLLAPSE_CERT_DETAILS : labels.EXPAND_CERT_DETAILS}
              iconType={isExpanded ? 'arrowDown' : 'arrowRight'}
            />
          </EuiToolTip>
        );
      },
    },
  ];

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap>
        <EuiFlexItem grow={true}>
          <EuiText size="s">
            <FormattedMessage
              id="xpack.synthetics.certs.list.recordRange"
              defaultMessage="Showing {range} of {total} {certsLabel}"
              values={{
                range: (
                  <strong>
                    <EuiI18nNumber value={rangeStart} />-<EuiI18nNumber value={rangeEnd} />
                  </strong>
                ),
                total: <EuiI18nNumber value={total} />,
                certsLabel: (
                  <strong>
                    {i18n.translate('xpack.synthetics.certs.list.recordRangeLabel', {
                      defaultMessage: '{total, plural, one {Certificate} other {Certificates}}',
                      values: { total },
                    })}
                  </strong>
                ),
              }}
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="s" />
      <EuiBasicTable
        loading={certificates.isLoading}
        columns={columns}
        items={certificates?.certs ?? []}
        itemId={getCertId}
        itemIdToExpandedRowMap={expandedRows}
        pagination={pagination}
        tableCaption={i18n.translate(
          'xpack.synthetics.certificates.certificatesList.tableCaption',
          {
            defaultMessage: 'Certificates overview',
          }
        )}
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
    </EuiPanel>
  );
};
