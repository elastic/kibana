/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import numeral from '@elastic/numeral';
import React from 'react';
import { SECURITY_CELL_ACTIONS_DEFAULT } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { SecurityCellActions, CellActionsMode } from '../../../../common/components/cell_actions';
import { CountryFlagAndName } from '../source_destination/country_flag';
import type {
  NetworkTopCountriesEdges,
  TopNetworkTablesEcsField,
} from '../../../../../common/search_strategy/security_solution/network';
import { FlowTargetSourceDest } from '../../../../../common/search_strategy/security_solution/network';
import { networkModel } from '../../store';
import { escapeDataProviderId } from '../../../../common/components/drag_and_drop/helpers';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import type { Columns } from '../../../components/paginated_table';
import * as i18n from './translations';
import { PreferenceFormattedBytes } from '../../../../common/components/formatted_bytes';

export type NetworkTopCountriesColumns = [
  Columns<NetworkTopCountriesEdges>,
  Columns<TopNetworkTablesEcsField['bytes_in']>,
  Columns<TopNetworkTablesEcsField['bytes_out']>,
  Columns<NetworkTopCountriesEdges>,
  Columns<NetworkTopCountriesEdges>,
  Columns<NetworkTopCountriesEdges>
];

export type NetworkTopCountriesColumnsNetworkDetails = [
  Columns<NetworkTopCountriesEdges>,
  Columns<TopNetworkTablesEcsField['bytes_in']>,
  Columns<TopNetworkTablesEcsField['bytes_out']>,
  Columns<NetworkTopCountriesEdges>,
  Columns<NetworkTopCountriesEdges>
];

export const getNetworkTopCountriesColumns = (
  flowTarget: FlowTargetSourceDest,
  type: networkModel.NetworkType,
  tableId: string
): NetworkTopCountriesColumns => [
  {
    name: i18n.COUNTRY,
    render: ({ node }) => {
      const geo = get(`${flowTarget}.country`, node);
      const geoAttr = `${flowTarget}.geo.country_iso_code`;
      const id = escapeDataProviderId(`${tableId}-table-${flowTarget}-country-${geo}`);
      if (geo != null) {
        return (
          <SecurityCellActions
            key={id}
            mode={CellActionsMode.HOVER_DOWN}
            visibleCellActions={5}
            showActionTooltips
            triggerId={SECURITY_CELL_ACTIONS_DEFAULT}
            data={{
              value: geo,
              field: geoAttr,
            }}
          >
            <CountryFlagAndName countryCode={geo} />
          </SecurityCellActions>
        );
      } else {
        return getEmptyTagValue();
      }
    },
    width: '20%',
  },
  {
    align: 'right',
    field: 'node.network.bytes_in',
    name: i18n.BYTES_IN,
    sortable: true,
    render: (bytes) => {
      if (bytes != null) {
        return <PreferenceFormattedBytes value={bytes} />;
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    align: 'right',
    field: 'node.network.bytes_out',
    name: i18n.BYTES_OUT,
    sortable: true,
    render: (bytes) => {
      if (bytes != null) {
        return <PreferenceFormattedBytes value={bytes} />;
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    align: 'right',
    field: `node.${flowTarget}.flows`,
    name: i18n.FLOWS,
    sortable: true,
    render: (flows) => {
      if (flows != null) {
        return numeral(flows).format('0,000');
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    align: 'right',
    field: `node.${flowTarget}.${flowTarget}_ips`,
    name: flowTarget === FlowTargetSourceDest.source ? i18n.SOURCE_IPS : i18n.DESTINATION_IPS,
    sortable: true,
    render: (ips) => {
      if (ips != null) {
        return numeral(ips).format('0,000');
      } else {
        return getEmptyTagValue();
      }
    },
  },
  {
    align: 'right',
    field: `node.${flowTarget}.${getOppositeField(flowTarget)}_ips`,
    name:
      getOppositeField(flowTarget) === FlowTargetSourceDest.source
        ? i18n.SOURCE_IPS
        : i18n.DESTINATION_IPS,
    sortable: true,
    render: (ips) => {
      if (ips != null) {
        return numeral(ips).format('0,000');
      } else {
        return getEmptyTagValue();
      }
    },
  },
];

export const getCountriesColumnsCurated = (
  flowTarget: FlowTargetSourceDest,
  type: networkModel.NetworkType,
  tableId: string
): NetworkTopCountriesColumns | NetworkTopCountriesColumnsNetworkDetails => {
  const columns = getNetworkTopCountriesColumns(flowTarget, type, tableId);

  // Columns to exclude from host details pages
  if (type === networkModel.NetworkType.details) {
    columns.pop();
    return columns;
  }

  return columns;
};

const getOppositeField = (flowTarget: FlowTargetSourceDest): FlowTargetSourceDest =>
  flowTarget === FlowTargetSourceDest.source
    ? FlowTargetSourceDest.destination
    : FlowTargetSourceDest.source;
