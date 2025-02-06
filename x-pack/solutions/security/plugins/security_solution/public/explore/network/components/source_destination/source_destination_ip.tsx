/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isEmpty, uniqWith } from 'lodash/fp';
import React from 'react';
import deepEqual from 'fast-deep-equal';

import { DESTINATION_IP_FIELD_NAME, SOURCE_IP_FIELD_NAME } from '../ip';
import { Port } from '../port';
import * as i18n from '../../../../timelines/components/timeline/body/renderers/translations';

import { GeoFields } from './geo_fields';
import { IpWithPort } from './ip_with_port';
import { Label } from './label';
import type { SourceDestinationIpProps, SourceDestinationType } from './types';

export interface IpPortPair {
  ip: string;
  port: string | null;
}

/**
 * Returns `true` if the ip field (i.e. `sourceIp`, `destinationIp`) that
 * corresponds with the specified `type` (i.e. `source`, `destination`) is
 * populated. This function will return `false` when the array only contains
 * empty values.
 */
export const isIpFieldPopulated = ({
  destinationIp,
  sourceIp,
  type,
}: {
  destinationIp?: string[] | null;
  sourceIp?: string[] | null;
  type: SourceDestinationType;
}): boolean =>
  (type === 'source' && sourceIp != null && sourceIp.some((ip) => !isEmpty(ip))) ||
  (type === 'destination' && destinationIp != null && destinationIp.some((ip) => !isEmpty(ip)));

/**
 * Returns an array of ports, filtered such that `null` entries are removed. If
 * the provided `destinationPort` and `sourcePort` do not contain valid ports,
 * an empty array will be returned.
 */
export const getPorts = ({
  destinationPort,
  sourcePort,
  type,
}: {
  destinationPort?: Array<number | string | null> | null;
  sourcePort?: Array<number | string | null> | null;
  type: SourceDestinationType;
}): string[] => {
  const ports =
    type === 'source' && sourcePort != null
      ? sourcePort
      : type === 'destination' && destinationPort != null
      ? destinationPort
      : [];

  return ports
    .filter((p) => p != null)
    .map((p) => `${p}`)
    .filter((p) => !isEmpty(p));
};

/**
 * Returns `true` if the array of ports, filtered to remove invalid entries,
 * has at least one port.
 */
export const hasPorts = ({
  destinationPort,
  sourcePort,
  type,
}: {
  destinationPort?: Array<number | string | null> | null;
  sourcePort?: Array<number | string | null> | null;
  type: SourceDestinationType;
}): boolean => getPorts({ destinationPort, sourcePort, type }).length > 0;

const IpAdressesWithPorts = React.memo<{
  contextId: string;
  destinationIp?: string[] | null;
  destinationPort?: Array<number | string | null> | null;
  eventId: string;
  sourceIp?: string[] | null;
  sourcePort?: Array<number | string | null> | null;
  type: SourceDestinationType;
}>(({ contextId, destinationIp, destinationPort, eventId, sourceIp, sourcePort, type }) => {
  const ip = type === 'source' ? sourceIp : destinationIp;
  const ipFieldName = type === 'source' ? SOURCE_IP_FIELD_NAME : DESTINATION_IP_FIELD_NAME;
  const port = type === 'source' ? sourcePort : destinationPort;

  if (ip == null) {
    return null; // if ip is not populated as an array, ports will be ignored
  }

  // IMPORTANT: The ip and port arrays are parallel arrays; the port at
  // index `i` corresponds with the ip address at index `i`. We must
  // preserve the relationships between the parallel arrays:
  const ipPortPairs: IpPortPair[] =
    port != null && ip.length === port.length
      ? ip.map((address, i) => ({
          ip: address,
          port: port[i] != null ? `${port[i]}` : null, // use the corresponding port in the parallel array
        }))
      : ip.map((address) => ({
          ip: address,
          port: null, // drop the port, because the length of the parallel ip and port arrays is different
        }));

  return (
    <EuiFlexGroup gutterSize="none">
      {uniqWith(deepEqual, ipPortPairs).map(
        (ipPortPair) =>
          ipPortPair.ip != null && (
            <EuiFlexItem grow={false} key={ipPortPair.ip}>
              <IpWithPort
                contextId={contextId}
                data-test-subj={`${type}-ip-and-port`}
                eventId={eventId}
                ip={ipPortPair.ip}
                ipFieldName={ipFieldName}
                port={ipPortPair.port}
              />
            </EuiFlexItem>
          )
      )}
    </EuiFlexGroup>
  );
});

IpAdressesWithPorts.displayName = 'IpAdressesWithPorts';

/**
 * When the ip field (i.e. `sourceIp`, `destinationIp`) that corresponds with
 * the specified `type` (i.e. `source`, `destination`) is populated, this component
 * renders:
 * - a label (i.e. `Source` or `Destination`)
 * - a draggable / hyperlinked IP address, when it's populated
 * - a port, hyperlinked to a port lookup service, when it's populated
 * - a summary of geolocation details, when they are populated
 */
export const SourceDestinationIp = React.memo<SourceDestinationIpProps>(
  ({
    contextId,
    destinationGeoContinentName,
    destinationGeoCountryName,
    destinationGeoCountryIsoCode,
    destinationGeoRegionName,
    destinationGeoCityName,
    destinationIp,
    destinationPort,
    eventId,
    sourceGeoContinentName,
    sourceGeoCountryName,
    sourceGeoCountryIsoCode,
    sourceGeoRegionName,
    sourceGeoCityName,
    sourceIp,
    sourcePort,
    type,
  }) => {
    const label = type === 'source' ? i18n.SOURCE : i18n.DESTINATION;

    return isIpFieldPopulated({ destinationIp, sourceIp, type }) ||
      hasPorts({ destinationPort, sourcePort, type }) ? (
      <EuiBadge data-test-subj={`${type}-ip-badge`} color="hollow" title="">
        <EuiFlexGroup
          alignItems="center"
          data-test-subj={`${type}-ip-group`}
          direction="column"
          gutterSize="xs"
        >
          <EuiFlexItem grow={false}>
            <Label>{label}</Label>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {isIpFieldPopulated({ destinationIp, sourceIp, type }) ? (
              <IpAdressesWithPorts
                contextId={contextId}
                destinationIp={destinationIp}
                destinationPort={destinationPort}
                eventId={eventId}
                sourceIp={sourceIp}
                sourcePort={sourcePort}
                type={type}
              />
            ) : (
              <EuiFlexGroup gutterSize="none">
                {getPorts({ destinationPort, sourcePort, type }).map((port, i) => (
                  <EuiFlexItem key={`port-${port}-${i}`} grow={false}>
                    <Port data-test-subj="port" value={port} />
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            )}
          </EuiFlexItem>
          <EuiFlexItem>
            <GeoFields
              contextId={contextId}
              destinationGeoContinentName={destinationGeoContinentName}
              destinationGeoCountryName={destinationGeoCountryName}
              destinationGeoCountryIsoCode={destinationGeoCountryIsoCode}
              destinationGeoRegionName={destinationGeoRegionName}
              destinationGeoCityName={destinationGeoCityName}
              eventId={eventId}
              sourceGeoContinentName={sourceGeoContinentName}
              sourceGeoCountryName={sourceGeoCountryName}
              sourceGeoCountryIsoCode={sourceGeoCountryIsoCode}
              sourceGeoRegionName={sourceGeoRegionName}
              sourceGeoCityName={sourceGeoCityName}
              type={type}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiBadge>
    ) : null;
  }
);

SourceDestinationIp.displayName = 'SourceDestinationIp';
