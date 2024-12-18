/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { Ip } from '../ip';
import { Port } from '../port';

const IpPortSeparator = styled.span`
  margin: 0 3px;
`;

IpPortSeparator.displayName = 'IpPortSeparator';

/**
 * Renders a separator (i.e. `:`) and a draggable, hyperlinked port when
 * a port is specified
 */
const PortWithSeparator = React.memo<{
  contextId: string;
  eventId: string;
  isDraggable?: boolean;
  port?: string | null;
  portFieldName: string;
}>(({ contextId, eventId, isDraggable, port, portFieldName }) => {
  return port != null ? (
    <EuiFlexGroup gutterSize="none">
      <EuiFlexItem grow={false}>
        <IpPortSeparator data-test-subj="ip-port-separator">{':'}</IpPortSeparator>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <Port
          contextId={contextId}
          data-test-subj="port"
          eventId={eventId}
          fieldName={portFieldName}
          isDraggable={isDraggable}
          value={port}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : null;
});

PortWithSeparator.displayName = 'PortWithSeparator';

/**
 * Renders a draggable, hyperlinked IP address, and if provided, an associated
 * draggable, hyperlinked port (with a separator between the IP address and port)
 */
export const IpWithPort = React.memo<{
  contextId: string;
  eventId: string;
  ip?: string | null;
  ipFieldName: string;
  isDraggable?: boolean;
  port?: string | null;
  portFieldName: string;
}>(({ contextId, eventId, ip, ipFieldName, isDraggable, port, portFieldName }) => (
  <EuiFlexGroup gutterSize="none">
    <EuiFlexItem grow={false}>
      <Ip
        contextId={contextId}
        data-test-subj="ip"
        eventId={eventId}
        fieldName={ipFieldName}
        isDraggable={isDraggable}
        value={ip}
      />
    </EuiFlexItem>
    <EuiFlexItem>
      <PortWithSeparator
        contextId={contextId}
        eventId={eventId}
        isDraggable={isDraggable}
        port={port}
        portFieldName={portFieldName}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
));

IpWithPort.displayName = 'IpWithPort';
