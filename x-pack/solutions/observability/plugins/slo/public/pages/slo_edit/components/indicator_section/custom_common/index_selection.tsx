/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow } from '@elastic/eui';
import { DataView } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { ALL_VALUE } from '@kbn/slo-schema';
import { DataViewPicker } from '@kbn/unified-search-plugin/public';
import React, { useEffect } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { SLOPublicPluginsStart } from '../../../../..';
import { useKibana } from '../../../../../hooks/use_kibana';
import { CreateSLOForm } from '../../../types';
import { getDataViewPatternOrId, useAdhocDataViews } from './use_adhoc_data_views';

const BTN_MAX_WIDTH = 515;

export const DATA_VIEW_FIELD = 'indicator.params.dataViewId';
const INDEX_FIELD = 'indicator.params.index';
const INDICATOR_TIMESTAMP_FIELD = 'indicator.params.timestampField';
const GROUP_BY_FIELD = 'groupBy';
const SETTINGS_SYNC_FIELD = 'settings.syncField';

export function IndexSelection({ selectedDataView }: { selectedDataView?: DataView }) {
  const { control, getFieldState, setValue, watch } = useFormContext<CreateSLOForm>();
  const {
    dataViews: dataViewsService,
    dataViewFieldEditor,
    dataViewEditor,
  } = useKibana<SLOPublicPluginsStart>().services;

  const currentIndexPattern = watch(INDEX_FIELD);
  const currentDataViewId = watch(DATA_VIEW_FIELD);

  const {
    dataViewsList,
    isDataViewsLoading,
    adHocDataViews,
    setAdHocDataViews,
    refetchDataViewsList,
  } = useAdhocDataViews({
    currentIndexPattern,
  });

  useEffect(() => {
    const indPatternId = getDataViewPatternOrId({
      byPattern: currentIndexPattern,
      dataViewsList,
      adHocDataViews,
    });
    if (!currentDataViewId && currentIndexPattern && !isDataViewsLoading && indPatternId) {
      setValue(DATA_VIEW_FIELD, indPatternId);
    }
  }, [
    adHocDataViews,
    currentDataViewId,
    currentIndexPattern,
    dataViewsList,
    isDataViewsLoading,
    setValue,
  ]);

  const updateDataViewDependantFields = (indexPattern?: string, timestampField?: string) => {
    setValue(INDEX_FIELD, indexPattern ?? '');
    setValue(INDICATOR_TIMESTAMP_FIELD, timestampField ?? '');
    setValue(GROUP_BY_FIELD, ALL_VALUE);
    setValue(SETTINGS_SYNC_FIELD, null);
  };

  return (
    <EuiFormRow
      label={INDEX_LABEL}
      isInvalid={getFieldState(INDEX_FIELD).invalid || getFieldState(DATA_VIEW_FIELD).invalid}
      fullWidth
    >
      <Controller
        defaultValue=""
        name={DATA_VIEW_FIELD}
        control={control}
        rules={{ required: true }}
        render={({ field, fieldState }) => (
          <DataViewPicker
            adHocDataViews={adHocDataViews}
            trigger={{
              label: currentIndexPattern || SELECT_DATA_VIEW,
              color: fieldState.invalid ? 'danger' : 'primary',
              isLoading: isDataViewsLoading,
              'data-test-subj': 'indexSelection',
              style: { width: '100%', maxWidth: BTN_MAX_WIDTH },
            }}
            onChangeDataView={(newId: string) => {
              field.onChange(newId);

              dataViewsService.get(newId).then((dataView) => {
                updateDataViewDependantFields(
                  getDataViewPatternOrId({ byId: newId, adHocDataViews, dataViewsList })!,
                  dataView.timeFieldName
                );
              });
            }}
            onAddField={
              currentDataViewId && selectedDataView
                ? () => {
                    dataViewFieldEditor.openEditor({
                      ctx: {
                        dataView: selectedDataView,
                      },
                      onSave: () => {},
                    });
                  }
                : undefined
            }
            currentDataViewId={
              field.value ??
              getDataViewPatternOrId({
                byPattern: currentIndexPattern,
                dataViewsList,
                adHocDataViews,
              })
            }
            onDataViewCreated={() => {
              dataViewEditor.openEditor({
                allowAdHocDataView: true,
                onSave: (dataView: DataView) => {
                  if (!dataView.isPersisted()) {
                    setAdHocDataViews((prev) => [...prev, dataView]);
                  } else {
                    refetchDataViewsList();
                  }

                  field.onChange(dataView.id);
                  updateDataViewDependantFields(dataView.getIndexPattern(), dataView.timeFieldName);
                },
              });
            }}
          />
        )}
      />
    </EuiFormRow>
  );
}

const SELECT_DATA_VIEW = i18n.translate('xpack.slo.sloEdit.customKql.dataViewSelection.label', {
  defaultMessage: 'Select a Data view',
});

const INDEX_LABEL = i18n.translate('xpack.slo.sloEdit.customKql.indexSelection.label', {
  defaultMessage: 'Index',
});
