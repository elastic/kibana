/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import type { TimelineModel } from '../../../../../store/model';
import { useDataView } from '../../../../../../data_view_manager/hooks/use_data_view';
import { useSelectDataView } from '../../../../../../data_view_manager/hooks/use_select_data_view';
import { useKibana } from '../../../../../../common/lib/kibana';
import {
  DEFAULT_ALERTS_INDEX,
  DEFAULT_DATA_VIEW_ID,
  DEFAULT_ALERT_DATA_VIEW_ID,
} from '../../../../../../../common/constants';
import { useSpaceId } from '../../../../../../common/hooks/use_space_id';
import { DataViewManagerScopeName } from '../../../../../../data_view_manager/constants';

export const DATA_VIEW_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.timeline.callOut.alertsOnlyMigration.dataView.helpText',
  {
    defaultMessage:
      'This duplicate data view has been filtered to only include detection alerts. Please click show advanced settings and toggle "Allow hidden and system indices" to enable the timestamp field.',
  }
);

export const useShouldShowAlertsOnlyMigrationMessage = ({
  currentTimelineIndices,
  dataViewId,
}: {
  currentTimelineIndices: TimelineModel['indexNames'];
  dataViewId: string | null;
}): boolean => {
  const currentSpace = useSpaceId();
  return useMemo(() => {
    // The only selected pattern is the alerts index pattern
    const isAlertsOnly =
      currentTimelineIndices.length === 1 &&
      currentTimelineIndices[0].includes(DEFAULT_ALERTS_INDEX);

    // The current data view is the default data view for the current space
    const currentDataView = dataViewId === `${DEFAULT_DATA_VIEW_ID}-${currentSpace}`;

    // Since the default data view is not just the alerts index, we can safely assume this user had
    // "show detection alerts only" enabled and is now impacted by the removal of that feature.
    return isAlertsOnly && currentDataView;
  }, [currentSpace, currentTimelineIndices, dataViewId]);
};

export const useTimelineSelectAlertsOnlyDataView = () => {
  const selectDataView = useSelectDataView();
  const spaceId = useSpaceId();

  return useCallback(() => {
    selectDataView({
      id: `${DEFAULT_ALERT_DATA_VIEW_ID}-${spaceId}`,
      scope: DataViewManagerScopeName.timeline,
    });
  }, [selectDataView, spaceId]);
};

export const useGetDuplicateDataViewWithAlertsOnly = ({
  dataViewId,
}: {
  dataViewId: string | null;
}) => {
  const { dataViewEditor, dataViews } = useKibana().services;
  const selectDataView = useSelectDataView();
  const closeDataViewEditor = useRef<() => void>(() => {});
  const [duplicateDataview, setDuplicateDataview] = useState<DataView | null>(null);
  const { dataView: currentDataView } = useDataView(DataViewManagerScopeName.timeline);
  const onDataViewCreated = useCallback(
    (newDataView: DataView) => {
      // Close the data view editor flyout
      if (newDataView?.id) {
        selectDataView({ id: newDataView.id, scope: DataViewManagerScopeName.timeline });
      }
      closeDataViewEditor.current();
    },
    [selectDataView]
  );

  useEffect(() => {
    const getDuplicateDataView = async () => {
      if (!dataViewId) {
        return;
      }
      const alertOnlyPattern = currentDataView
        ?.getIndexPattern()
        .split(',')
        .filter((index) => index.includes(DEFAULT_ALERTS_INDEX));

      if (alertOnlyPattern.length === 0) {
        return null;
      }

      return dataViews.create({
        ...currentDataView.toSpec(),
        title: alertOnlyPattern.join(','),
        id: undefined,
        version: undefined,
        managed: false,
      });
    };
    getDuplicateDataView().then((dv) => {
      if (dv) setDuplicateDataview(dv);
    });
  }, [currentDataView, dataViewId, dataViews]);

  return useCallback(() => {
    if (!dataViewEditor || !duplicateDataview) {
      return;
    }
    dataViewEditor.openEditor({
      editData: duplicateDataview,
      getDataViewHelpText: () => DATA_VIEW_HELP_TEXT,
      onSave: (newDataView) => {
        onDataViewCreated(newDataView);
      },
      isDuplicating: true,
    });
  }, [dataViewEditor, duplicateDataview, onDataViewCreated]);
};
