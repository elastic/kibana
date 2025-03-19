/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import {
  uiMetricService,
  UNIVERSAL_ENTITY_FLYOUT_OPENED,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { METRIC_TYPE } from '@kbn/analytics';
import type { EntityEcs } from '@kbn/securitysolution-ecs/src/entity';
import type { EsHitRecord } from '@kbn/discover-utils';
import { UniversalEntityFlyoutHeader } from './header';
import { UniversalEntityFlyoutContent } from './content';
import { FlyoutNavigation } from '../../shared/components/flyout_navigation';

export interface UniversalEntityPanelProps {
  entity: EntityEcs;
  source: EsHitRecord['_source'];
  /** this is because FlyoutPanelProps defined params as Record<string, unknown> {@link FlyoutPanelProps#params} */
  [key: string]: unknown;
}

export interface UniversalEntityPanelExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'universal-entity-panel';
  params: UniversalEntityPanelProps;
}

const isDate = (value: unknown): value is Date => value instanceof Date;

export const UniversalEntityPanel = ({ entity, source }: UniversalEntityPanelProps) => {
  useEffect(() => {
    uiMetricService.trackUiMetric(METRIC_TYPE.COUNT, UNIVERSAL_ENTITY_FLYOUT_OPENED);
  }, [entity]);

  const docTimestamp = source?.['@timestamp'];
  const timestamp = isDate(docTimestamp) ? docTimestamp : undefined;

  return (
    <>
      <FlyoutNavigation flyoutIsExpandable={false} />
      <UniversalEntityFlyoutHeader entity={entity} timestamp={timestamp} />
      <UniversalEntityFlyoutContent source={source} />
    </>
  );
};

UniversalEntityPanel.displayName = 'UniversalEntityPanel';
