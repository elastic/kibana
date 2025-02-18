/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { getOr } from 'lodash/fp';
import React, { Fragment } from 'react';
import type { HostEcs } from '@kbn/securitysolution-ecs';
import type {
  AutonomousSystem,
  FlowTarget,
  FlowTargetSourceDest,
  NetworkDetailsStrategyResponse,
} from '../../../../common/search_strategy';
import { DefaultDraggable } from '../../../common/components/draggables';
import { getEmptyTagValue } from '../../../common/components/empty_value';
import { HostDetailsLink, ReputationLink, WhoIsLink } from '../../../common/components/links';
import * as i18n from '../../../explore/network/components/details/translations';
import type { SourcererScopeName } from '../../../sourcerer/store/model';

export const IpOverviewId = 'ip-overview';

export const locationRenderer = (
  fieldNames: string[],
  data: NetworkDetailsStrategyResponse['networkDetails'],
  contextID?: string
): React.ReactElement =>
  fieldNames.length > 0 && fieldNames.every((fieldName) => getOr(null, fieldName, data)) ? (
    <EuiFlexGroup alignItems="center" gutterSize="none">
      {fieldNames.map((fieldName, index) => {
        const locationValue = getOr('', fieldName, data);
        return (
          <Fragment key={`${IpOverviewId}-${fieldName}`}>
            {index ? ',\u00A0' : ''}
            <EuiFlexItem grow={false}>
              <DefaultDraggable
                id={`location-renderer-default-draggable-${IpOverviewId}-${
                  contextID ? `${contextID}-` : ''
                }${fieldName}`}
                field={fieldName}
                value={locationValue}
                isAggregatable={true}
                fieldType={'keyword'}
              />
            </EuiFlexItem>
          </Fragment>
        );
      })}
    </EuiFlexGroup>
  ) : (
    getEmptyTagValue()
  );

export const autonomousSystemRenderer = (
  as: AutonomousSystem,
  flowTarget: FlowTarget | FlowTargetSourceDest,
  contextID?: string
): React.ReactElement =>
  as && as.organization && as.organization.name && as.number ? (
    <EuiFlexGroup alignItems="center" gutterSize="none">
      <EuiFlexItem grow={false}>
        <DefaultDraggable
          id={`autonomous-system-renderer-default-draggable-${IpOverviewId}-${
            contextID ? `${contextID}-` : ''
          }${flowTarget}.as.organization.name`}
          field={`${flowTarget}.as.organization.name`}
          value={as.organization.name}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{'/'}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <DefaultDraggable
          id={`autonomous-system-renderer-default-draggable-${IpOverviewId}-${
            contextID ? `${contextID}-` : ''
          }${flowTarget}.as.number`}
          field={`${flowTarget}.as.number`}
          value={`${as.number}`}
          isAggregatable={true}
          fieldType={'number'}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    getEmptyTagValue()
  );

interface HostIdRendererTypes {
  contextID?: string;
  host: HostEcs;
  ipFilter?: string;
  noLink?: boolean;
  scopeId: string | undefined;
}

export const hostIdRenderer = ({
  contextID,
  host,
  ipFilter,
  noLink,
  scopeId,
}: HostIdRendererTypes): React.ReactElement =>
  host.id && host.ip && (ipFilter == null || host.ip.includes(ipFilter)) ? (
    <>
      {host.name && host.name[0] != null ? (
        <DefaultDraggable
          id={`host-id-renderer-default-draggable-${IpOverviewId}-${
            contextID ? `${contextID}-` : ''
          }host-id`}
          field="host.id"
          value={host.id[0]}
          isAggregatable={true}
          fieldType={'keyword'}
          scopeId={scopeId}
        >
          {noLink ? (
            <>{host.id}</>
          ) : (
            <HostDetailsLink hostName={host.name[0]}>{host.id}</HostDetailsLink>
          )}
        </DefaultDraggable>
      ) : (
        <>{host.id}</>
      )}
    </>
  ) : (
    getEmptyTagValue()
  );

export const hostNameRenderer = (
  scopeId: SourcererScopeName,
  host?: HostEcs,
  ipFilter?: string,
  contextID?: string
): React.ReactElement =>
  host &&
  host.name &&
  host.name[0] &&
  host.ip &&
  (!(ipFilter != null) || host.ip.includes(ipFilter)) ? (
    <DefaultDraggable
      id={`host-name-renderer-default-draggable-${IpOverviewId}-${
        contextID ? `${contextID}-` : ''
      }host-name`}
      field={'host.name'}
      value={host.name[0]}
      isAggregatable={true}
      fieldType={'keyword'}
      scopeId={scopeId}
    >
      <HostDetailsLink hostName={host.name[0]}>
        {host.name ? host.name : getEmptyTagValue()}
      </HostDetailsLink>
    </DefaultDraggable>
  ) : (
    getEmptyTagValue()
  );

export const whoisRenderer = (ip: string) => <WhoIsLink domain={ip}>{i18n.VIEW_WHOIS}</WhoIsLink>;

export const reputationRenderer = (ip: string): React.ReactElement => (
  <ReputationLink domain={ip} direction="column" />
);
