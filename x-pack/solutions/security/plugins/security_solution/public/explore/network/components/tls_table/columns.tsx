/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';

import type { NetworkTlsNode } from '../../../../../common/search_strategy';
import type { Columns } from '../../../components/paginated_table';
import { getRowItemsWithActions } from '../../../../common/components/tables/helpers';
import { LocalizedDateTooltip } from '../../../../common/components/localized_date_tooltip';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';

import * as i18n from './translations';

export type TlsColumns = [
  Columns<NetworkTlsNode>,
  Columns<NetworkTlsNode>,
  Columns<NetworkTlsNode['_id']>,
  Columns<NetworkTlsNode>,
  Columns<NetworkTlsNode>
];

export const getTlsColumns = (tableId: string): TlsColumns => [
  {
    field: 'node',
    name: i18n.ISSUER,
    truncateText: false,
    mobileOptions: { show: true },
    sortable: false,
    render: ({ _id, issuers }) =>
      getRowItemsWithActions({
        values: issuers,
        fieldName: 'tls.server.issuer',
        idPrefix: `${tableId}-${_id}-table-issuers`,
      }),
  },
  {
    field: 'node',
    name: i18n.SUBJECT,
    truncateText: false,
    mobileOptions: { show: true },
    sortable: false,
    render: ({ _id, subjects }) =>
      getRowItemsWithActions({
        values: subjects,
        fieldName: 'tls.server.subject',
        idPrefix: `${tableId}-${_id}-table-subjects`,
      }),
  },
  {
    field: 'node._id',
    name: i18n.SHA1_FINGERPRINT,
    truncateText: false,
    mobileOptions: { show: true },
    sortable: true,
    render: (sha1) =>
      getRowItemsWithActions({
        values: sha1 ? [sha1] : undefined,
        fieldName: 'tls.server.hash.sha1',
        idPrefix: `${tableId}-${sha1}-table-sha1`,
      }),
  },
  {
    field: 'node',
    name: i18n.JA3_FINGERPRINT,
    truncateText: false,
    mobileOptions: { show: true },
    sortable: false,
    render: ({ _id, ja3 }) =>
      getRowItemsWithActions({
        values: ja3,
        fieldName: 'tls.server.ja3s',
        idPrefix: `${tableId}-${_id}-table-ja3`,
      }),
  },
  {
    field: 'node',
    name: i18n.VALID_UNTIL,
    truncateText: false,
    mobileOptions: { show: true },
    sortable: false,
    render: ({ _id, notAfter }) =>
      getRowItemsWithActions({
        values: notAfter,
        fieldName: 'tls.server.not_after',
        idPrefix: `${tableId}-${_id}-table-notAfter`,
        render: (validUntil) => (
          <LocalizedDateTooltip date={moment(new Date(validUntil)).toDate()}>
            <PreferenceFormattedDate value={new Date(validUntil)} />
          </LocalizedDateTooltip>
        ),
      }),
  },
];
