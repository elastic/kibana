/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { getRiskInputTab } from '../../../entity_analytics/components/entity_details_flyout';
import { EntityType } from '../../../../common/entity_analytics/types';
import type { LeftPanelTabsType } from '../shared/components/left_panel/left_panel_header';

export const useTabs = (name: string, scopeId: string): LeftPanelTabsType =>
  useMemo(() => {
    return [
      getRiskInputTab({
        entityName: name,
        entityType: EntityType.service,
        scopeId,
      }),
    ];
  }, [name, scopeId]);
