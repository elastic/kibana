/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { getOr } from 'lodash/fp';
import React, { Fragment, useMemo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { HostEcs } from '@kbn/securitysolution-ecs';
import { ecsSliceToFlattenedDocument } from '../../../../flyout/document_details/shared/utils';
import type { PageScope } from '../../../../data_view_manager/constants';
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
import { FLYOUT_LINK_TEST_ID } from '../../../../flyout/shared/components/test_ids';
import { OpenFlyoutLink } from '../../../../flyout_v2/shared/components/open_flyout_link';

/**
 * Wraps the host ECS slice in a minimal record, so `OpenFlyoutLink` can hand it to the host flyout,
 * which derives the host's entity id (EUID) from it.
 *
 * Returns `undefined` when the host has no `host.id`: the EUID would then be derived from
 * `host.name`, which never matches a stored host entity (they're identified by `host.id`). Without a
 * record, the host flyout looks the entity up by `host.name` instead.
 */
const useHostRecord = (host: HostEcs): DataTableRecord | undefined =>
  useMemo(() => {
    const flattened = ecsSliceToFlattenedDocument('host', host);
    const id = flattened['host.id'];
    if (!id) return undefined;
    return { id, raw: { _id: id, _index: '' }, flattened };
  }, [host]);

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
}

export const HostIdRenderer = ({
  contextID,
  host,
  ipFilter,
  noLink,
  scopeId,
}: HostIdRendererTypes): React.ReactElement => {
  const hostName = host.name && host.name[0];
  const hostRecord = useHostRecord(host);
  return host.id && host.ip && (ipFilter == null || host.ip.includes(ipFilter)) ? (
    <>
      {hostName != null ? (
        <DefaultFieldRenderer
          rowItems={Array.isArray(host.id) ? host.id : [host.id]}
          attrName={'host.id'}
          idPrefix={contextID ? `host-overview-${contextID}` : 'host-overview'}
          scopeId={scopeId}
          render={(id) =>
            noLink ? (
              <>{id}</>
            ) : (
              <OpenFlyoutLink
                field="host.name"
                value={hostName}
                hit={hostRecord}
                data-test-subj={FLYOUT_LINK_TEST_ID}
              >
                {id}
              </OpenFlyoutLink>
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
}
export const HostNameRenderer = ({
  scopeId,
  host,
  ipFilter,
}: HostNameRendererTypes): React.ReactElement => {
  const hostRecord = useHostRecord(host);
  return host.name &&
    host.name[0] &&
    host.ip &&
    (!(ipFilter != null) || host.ip.includes(ipFilter)) ? (
    <CellActionsRenderer field={'host.name'} value={host.name[0]} scopeId={scopeId}>
      <OpenFlyoutLink
        field="host.name"
        value={host.name[0]}
        hit={hostRecord}
        data-test-subj={FLYOUT_LINK_TEST_ID}
      />
    </CellActionsRenderer>
  ) : (
    getEmptyTagValue()
  );
};

export const whoisRenderer = (ip: string) => <WhoIsLink domain={ip}>{i18n.VIEW_WHOIS}</WhoIsLink>;

export const reputationRenderer = (ip: string): React.ReactElement => (
  <ReputationLink domain={ip} direction="column" />
);
