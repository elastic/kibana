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
import { DefaultFieldRenderer } from '../../../../timelines/components/field_renderers/default_renderer';
import type {
  AutonomousSystem,
  FlowTarget,
  FlowTargetSourceDest,
  NetworkDetailsStrategyResponse,
} from '../../../../../common/search_strategy';
import { CellActionsRenderer } from '../../../../common/components/cell_actions/cell_actions_renderer';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { ReputationLink, WhoIsLink } from '../../../../common/components/links';
import * as i18n from '../details/translations';
import type { PageScope } from '../../../../sourcerer/store/model';
import { FlyoutLink } from '../../../../flyout/shared/components/flyout_link';

export const IpOverviewId = 'ip-overview';

export const locationRenderer = (
  fieldNames: string[],
  data: NetworkDetailsStrategyResponse['networkDetails'],
  scopeId: string
): React.ReactElement =>
  fieldNames.length > 0 && fieldNames.every((fieldName) => getOr(null, fieldName, data)) ? (
    <EuiFlexGroup alignItems="center" gutterSize="none">
      {fieldNames.map((fieldName, index) => {
        const locationValue = getOr('', fieldName, data);
        return (
          <Fragment key={`${IpOverviewId}-${fieldName}`}>
            {index ? ',\u00A0' : ''}
            <EuiFlexItem grow={false}>
              <CellActionsRenderer scopeId={scopeId} field={fieldName} value={locationValue} />
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
  scopeId: string
): React.ReactElement =>
  as && as.organization && as.organization.name && as.number ? (
    <EuiFlexGroup alignItems="center" gutterSize="none">
      <EuiFlexItem grow={false}>
        <CellActionsRenderer
          scopeId={scopeId}
          field={`${flowTarget}.as.organization.name`}
          value={as.organization.name}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{'/'}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <CellActionsRenderer
          scopeId={scopeId}
          field={`${flowTarget}.as.number`}
          value={`${as.number}`}
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
  scopeId: string;
  isFlyoutOpen: boolean;
}

export const hostIdRenderer = ({
  contextID,
  host,
  ipFilter,
  noLink,
  scopeId,
  isFlyoutOpen,
}: HostIdRendererTypes): React.ReactElement => {
  const hostName = host.name && host.name[0];
  return host.id && host.ip && (ipFilter == null || host.ip.includes(ipFilter)) ? (
    <>
      {hostName != null ? (
        <DefaultFieldRenderer
          rowItems={host.id}
          attrName={'host.id'}
          idPrefix={contextID ? `host-overview-${contextID}` : 'host-overview'}
          scopeId={scopeId}
          render={(id) =>
            noLink ? (
              <>{id}</>
            ) : (
              <FlyoutLink
                field={'host.name'}
                value={hostName}
                scopeId={scopeId}
                isFlyoutOpen={isFlyoutOpen}
              >
                {id}
              </FlyoutLink>
            )
          }
        />
      ) : (
        <>{host.id}</>
      )}
    </>
  ) : (
    getEmptyTagValue()
  );
};

interface HostNameRendererTypes {
  scopeId: PageScope;
  host: HostEcs;
  ipFilter?: string;
  isFlyoutOpen: boolean;
}
export const hostNameRenderer = ({
  scopeId,
  host,
  ipFilter,
  isFlyoutOpen,
}: HostNameRendererTypes): React.ReactElement =>
  host.name && host.name[0] && host.ip && (!(ipFilter != null) || host.ip.includes(ipFilter)) ? (
    <CellActionsRenderer field={'host.name'} value={host.name[0]} scopeId={scopeId}>
      <FlyoutLink
        field={'host.name'}
        value={host.name[0]}
        scopeId={scopeId}
        isFlyoutOpen={isFlyoutOpen}
      />
    </CellActionsRenderer>
  ) : (
    getEmptyTagValue()
  );

export const whoisRenderer = (ip: string) => <WhoIsLink domain={ip}>{i18n.VIEW_WHOIS}</WhoIsLink>;

export const reputationRenderer = (ip: string): React.ReactElement => (
  <ReputationLink domain={ip} direction="column" />
);
