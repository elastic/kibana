/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { useMisconfigurationFinding } from '@kbn/cloud-security-posture/src/hooks/use_misconfiguration_finding';
import { createMisconfigurationFindingsQuery } from '@kbn/cloud-security-posture';
import { FlyoutNavigation } from '../../../shared/components/flyout_navigation';
import { FindingsMisconfigurationFlyoutHeader } from './header';

export interface FindingsMisconfigurationPanelProps extends Record<string, unknown> {
  resourceId: string;
  ruleId: string;
}

export interface FindingsMisconfigurationPanelExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'findings-misconfiguration-panel';
  params: FindingsMisconfigurationPanelProps;
}

export const FindingsMisconfigurationPanelTrial = ({
  resourceId,
  ruleId,
}: FindingsMisconfigurationPanelProps) => {
  const { data: dataIsenk } = useMisconfigurationFinding({
    query: createMisconfigurationFindingsQuery(resourceId, ruleId),
    enabled: true,
    pageSize: 1,
  });
  const dataSource = dataIsenk?.result.hits[0]._source;
  const dateFormatted = new Date(dataSource?.['@timestamp'] || '');
  const rulesTags = dataSource?.rule.tags;
  const resourceName = dataSource?.resource.name;
  const vendor = dataSource?.observer.vendor;
  const ruleBenchmarkId = dataSource?.rule.benchmark.id;
  const ruleBenchmarkName = dataSource?.rule.benchmark.name;
  return (
    <>
      <FlyoutNavigation flyoutIsExpandable={false} />
      <FindingsMisconfigurationFlyoutHeader
        ruleName={dataSource?.rule.name || ''}
        timestamp={dateFormatted}
        rulesTags={rulesTags}
        resourceName={resourceName}
        vendor={vendor}
        ruleBenchmarkName={ruleBenchmarkName}
        ruleBenchmarkId={ruleBenchmarkId}
      />
    </>
  );
};

FindingsMisconfigurationPanelTrial.displayName = 'FindingsMisconfigurationPanelTrial';
