/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import { TagsList } from '@kbn/observability-shared-plugin/public';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { LocationsBadge } from './locations_badge';
import { MonitorTypeBadge } from '../../../../common/components/monitor_type_badge';
import { SyntheticsRemoteBadge } from '../../../../common/components/synthetics_remote_badge';
import { SyntheticsHeartbeatBadge } from '../../../../common/components/synthetics_heartbeat_badge';
import type { OverviewStatusMetaData } from '../../../../../../../../common/runtime_types';

export const MetricItemBody = ({
  monitor,
  onLocationClick,
}: {
  monitor: OverviewStatusMetaData;
  onLocationClick?: (locationId: string, locationLabel: string) => void;
}) => {
  const tags = monitor.tags;
  const history = useHistory();

  // One wrapping flex group for type/remote/heartbeat/locations + tags.
  // Nested wrap groups (badges | TagsList) vertically center the type badge
  // against a multi-row tag block and indent the second tag row.
  const leadingBadges = (
    <>
      <EuiFlexItem grow={false}>
        <MonitorTypeBadge
          monitorType={monitor.type}
          onClick={() => {
            history.push({
              search: `monitorTypes=${encodeURIComponent(JSON.stringify([monitor.type]))}`,
            });
          }}
        />
      </EuiFlexItem>
      {monitor.remote && (
        <EuiFlexItem grow={false}>
          <SyntheticsRemoteBadge remote={monitor.remote} />
        </EuiFlexItem>
      )}
      {monitor.origin === 'heartbeat' && (
        <EuiFlexItem grow={false}>
          <SyntheticsHeartbeatBadge origin={monitor.origin} />
        </EuiFlexItem>
      )}
      {monitor.locations.length > 1 && (
        <EuiFlexItem grow={false}>
          <LocationsBadge monitor={monitor} onLocationClick={onLocationClick} />
        </EuiFlexItem>
      )}
    </>
  );

  return (
    <>
      <EuiSpacer size="xs" />
      {tags.length > 0 ? (
        <div css={{ width: '100%', minWidth: 0 }}>
          <TagsList
            color="default"
            tags={tags}
            disableExpand={true}
            maxWidth="100%"
            prependChildren={leadingBadges}
            onClick={(tag) => {
              history.push({ search: `tags=${encodeURIComponent(JSON.stringify([tag]))}` });
            }}
          />
        </div>
      ) : (
        <EuiFlexGroup gutterSize="xs" responsive={false} wrap alignItems="center">
          {leadingBadges}
        </EuiFlexGroup>
      )}
    </>
  );
};
