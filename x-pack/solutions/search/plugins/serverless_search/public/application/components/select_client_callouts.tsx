/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { ConnectorsCallout } from './connectors_callout';
import { FileUploadCallout } from './file_upload_callout';

export const SelectClientCallouts: React.FC = () => (
  <EuiFlexGroup gutterSize="s">
    <EuiFlexItem>
      <ConnectorsCallout />
    </EuiFlexItem>
    <EuiFlexItem>
      <FileUploadCallout />
    </EuiFlexItem>
  </EuiFlexGroup>
);
