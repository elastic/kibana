/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { METRIC_TYPE } from '@kbn/analytics';
import {
  UNIVERSAL_ENTITY_FLYOUT_OPENED,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { useGetGenericEntity } from './hooks/use_get_generic_entity';
import { FlyoutNavigation } from '../../shared/components/flyout_navigation';
import { UniversalEntityFlyoutHeader } from './header';
import { UniversalEntityFlyoutContent } from './content';

export interface UniversalEntityPanelProps {
  entityDocId: string;
  /** this is because FlyoutPanelProps defined params as Record<string, unknown> {@link FlyoutPanelProps#params} */
  [key: string]: unknown;
}

export interface UniversalEntityPanelExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'universal-entity-panel';
  params: UniversalEntityPanelProps;
}

export const UniversalEntityPanel = ({ entityDocId }: UniversalEntityPanelProps) => {
  const getGenericEntity = useGetGenericEntity(entityDocId);

  useEffect(() => {
    if (getGenericEntity.data?._id) {
      uiMetricService.trackUiMetric(METRIC_TYPE.COUNT, UNIVERSAL_ENTITY_FLYOUT_OPENED);
    }
  }, [getGenericEntity.data?._id]);

  if (!getGenericEntity.isSuccess) {
    return <>loading</>;
  }

  const source = getGenericEntity.data._source;
  const entity = getGenericEntity.data._source.entity;

  return (
    <>
      <FlyoutNavigation flyoutIsExpandable={false} />
      <UniversalEntityFlyoutHeader entity={entity} source={source} />
      <UniversalEntityFlyoutContent source={source} />
    </>
  );
};

UniversalEntityPanel.displayName = 'UniversalEntityPanel';
