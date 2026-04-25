/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { AgentIcon } from '@kbn/custom-icons';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import { PageTitleWithPopover } from './page_title_with_popover';

export const HostHeaderTitle = ({
  title,
  schema,
}: {
  title?: string;
  schema?: DataSchemaFormat | null;
}) => {
  return schema === 'semconv' ? (
    <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
      <EuiFlexItem grow={false}>{title}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <AgentIcon agentName="opentelemetry" role="presentation" />
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <PageTitleWithPopover name={title ?? ''} />
  );
};
