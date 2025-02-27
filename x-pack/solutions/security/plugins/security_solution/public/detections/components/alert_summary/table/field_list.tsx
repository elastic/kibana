/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useRef } from 'react';
import {
  UnifiedFieldListSidebarContainer,
  type UnifiedFieldListSidebarContainerApi,
  type UnifiedFieldListSidebarContainerProps,
} from '@kbn/unified-field-list';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { DataView } from '@kbn/data-views-plugin/common';
import { useKibana } from '../../../../common/lib/kibana';

export const getFieldsListCreationOptions: UnifiedFieldListSidebarContainerProps['getCreationOptions'] =
  () => ({
    originatingApp: 'security_solution',
  });

export interface FieldListProps {
  /**
   *
   */
  dataView: DataView;
}

/**
 *
 */
export const FieldList = memo(({ dataView }: FieldListProps) => {
  const unifiedFieldListContainerRef = useRef<UnifiedFieldListSidebarContainerApi>(null);

  const {
    services: {
      uiSettings,
      fieldFormats,
      dataViews,
      dataViewFieldEditor,
      uiActions,
      charts,
      docLinks,
      analytics,
      timelineDataService,
    },
  } = useKibana();
  const services: UnifiedFieldListSidebarContainerProps['services'] = useMemo(
    () => ({
      fieldFormats,
      dataViews,
      dataViewFieldEditor,
      data: timelineDataService,
      uiActions,
      charts,
      core: {
        analytics,
        uiSettings,
        docLinks,
      } as CoreStart,
    }),
    [
      fieldFormats,
      dataViews,
      dataViewFieldEditor,
      timelineDataService,
      uiActions,
      charts,
      uiSettings,
      docLinks,
      analytics,
    ]
  );

  const onAddFieldToWorkspace = useCallback(() => window.alert('onAddFieldToWorkspace'), []);
  const onRemoveFieldFromWorkspace = useCallback(() => window.alert('onAddFieldToWorkspace'), []);

  return (
    <UnifiedFieldListSidebarContainer
      ref={unifiedFieldListContainerRef}
      allFields={dataView.fields}
      dataView={dataView}
      getCreationOptions={getFieldsListCreationOptions}
      onAddFieldToWorkspace={onAddFieldToWorkspace}
      onRemoveFieldFromWorkspace={onRemoveFieldFromWorkspace}
      services={services}
    />
  );
});

FieldList.displayName = 'FieldList';
