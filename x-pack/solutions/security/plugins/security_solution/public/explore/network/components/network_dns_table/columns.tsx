/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';
import React from 'react';

import { SECURITY_CELL_ACTIONS_DEFAULT } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { SecurityCellActions, CellActionsMode } from '../../../../common/components/cell_actions';
import type { NetworkDnsItem } from '../../../../../common/search_strategy';
import { NetworkDnsFields } from '../../../../../common/search_strategy';
import { escapeDataProviderId } from '../../../../common/components/drag_and_drop/helpers';
import { defaultToEmptyTag, getEmptyTagValue } from '../../../../common/components/empty_value';
import type { Columns } from '../../../components/paginated_table';
import { PreferenceFormattedBytes } from '../../../../common/components/formatted_bytes';

import * as i18n from './translations';

export type NetworkDnsColumns = [
  Columns<NetworkDnsItem['dnsName']>,
  Columns<NetworkDnsItem['queryCount']>,
  Columns<NetworkDnsItem['uniqueDomains']>,
  Columns<NetworkDnsItem['dnsBytesIn']>,
  Columns<NetworkDnsItem['dnsBytesOut']>
];

export const getNetworkDnsColumns = (): NetworkDnsColumns => [
  {
    field: `node.${NetworkDnsFields.dnsName}`,
    name: i18n.REGISTERED_DOMAIN,
    truncateText: false,
    mobileOptions: { show: true },
    sortable: true,
    render: (dnsName) => {
      if (dnsName != null) {
        return (
          <SecurityCellActions
            key={escapeDataProviderId(`networkDns-table--name-${dnsName}`)}
            mode={CellActionsMode.HOVER_DOWN}
            visibleCellActions={5}
            showActionTooltips
            triggerId={SECURITY_CELL_ACTIONS_DEFAULT}
            data={{
              value: dnsName,
              field: 'dns.question.registered_domain',
            }}
          >
            {defaultToEmptyTag(dnsName)}
          </SecurityCellActions>
        );
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    align: 'right',
    field: `node.${NetworkDnsFields.queryCount}`,
    name: i18n.TOTAL_QUERIES,
    sortable: true,
    truncateText: false,
    mobileOptions: { show: true },
    render: (queryCount) => {
      if (queryCount != null) {
        return numeral(queryCount).format('0');
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    align: 'right',
    field: `node.${NetworkDnsFields.uniqueDomains}`,
    name: i18n.UNIQUE_DOMAINS,
    sortable: true,
    truncateText: false,
    mobileOptions: { show: true },
    render: (uniqueDomains) => {
      if (uniqueDomains != null) {
        return numeral(uniqueDomains).format('0');
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    align: 'right',
    field: `node.${NetworkDnsFields.dnsBytesIn}`,
    name: i18n.DNS_BYTES_IN,
    sortable: true,
    truncateText: false,
    mobileOptions: { show: true },
    render: (dnsBytesIn) => {
      if (dnsBytesIn != null) {
        return <PreferenceFormattedBytes value={dnsBytesIn} />;
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    align: 'right',
    field: `node.${NetworkDnsFields.dnsBytesOut}`,
    name: i18n.DNS_BYTES_OUT,
    sortable: true,
    truncateText: false,
    mobileOptions: { show: true },
    render: (dnsBytesOut) => {
      if (dnsBytesOut != null) {
        return <PreferenceFormattedBytes value={dnsBytesOut} />;
      } else {
        return getEmptyTagValue();
      }
    },
  },
];
