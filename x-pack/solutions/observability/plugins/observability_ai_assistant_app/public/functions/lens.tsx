/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import { i18n } from '@kbn/i18n';
import type { LensSeriesLayer } from '@kbn/lens-embeddable-utils';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import type { LensByValueInput, LensPublicStart } from '@kbn/lens-plugin/public';
import React, { useState } from 'react';
import type { AsyncState } from 'react-use/lib/useAsync';
import useAsync from 'react-use/lib/useAsync';
import type {
  RegisterRenderFunctionDefinition,
  RenderFunction,
} from '@kbn/observability-ai-assistant-plugin/public/types';
import type { LensFunctionArguments } from '../../common/functions/lens';
import type { ObservabilityAIAssistantAppPluginStartDependencies } from '../types';

export enum SeriesType {
  Bar = 'bar',
  Line = 'line',
  Area = 'area',
  BarStacked = 'bar_stacked',
  AreaStacked = 'area_stacked',
  BarHorizontal = 'bar_horizontal',
  BarPercentageStacked = 'bar_percentage_stacked',
  AreaPercentageStacked = 'area_percentage_stacked',
  BarHorizontalPercentageStacked = 'bar_horizontal_percentage_stacked',
}

function Lens({
  indexPattern,
  xyDataLayer,
  start,
  end,
  lens,
  dataViews,
  timeField,
}: {
  indexPattern: string;
  xyDataLayer: LensSeriesLayer;
  start: string;
  end: string;
  lens: LensPublicStart;
  dataViews: DataViewsServicePublic;
  timeField: string;
}) {
  const dataViewAsync = useAsync(() => {
    return dataViews.create({
      title: indexPattern,
      timeFieldName: timeField,
    });
  }, [indexPattern, dataViews, timeField]);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  const lensEmbeddableInputAsync: AsyncState<LensByValueInput | undefined> = useAsync(async () => {
    if (!dataViewAsync.value) {
      return;
    }

    const lensBuilder = new LensConfigBuilder(dataViews);
    return (await lensBuilder.build(
      {
        dataset: {
          index: dataViewAsync.value.name,
          timeFieldName: dataViewAsync.value.timeFieldName,
        },
        chartType: 'xy',
        title: '',
        layers: [xyDataLayer],
      },
      {
        embeddable: true,
        timeRange: {
          from: start,
          to: end,
          type: 'relative' as const,
        },
      }
    )) as LensByValueInput;
  });

  if (!dataViewAsync.value || !lensEmbeddableInputAsync.value) {
    return <EuiLoadingSpinner />;
  }

  const lensEmbeddableInput = lensEmbeddableInputAsync.value;

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="row" gutterSize="s" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="observabilityAiAssistantLensOpenInLensButton"
                iconType="lensApp"
                onClick={() => {
                  lens.navigateToPrefilledEditor(lensEmbeddableInput);
                }}
              >
                {i18n.translate('xpack.observabilityAiAssistant.lensFunction.openInLens', {
                  defaultMessage: 'Open in Lens',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="observabilityAiAssistantLensSaveButton"
                iconType="save"
                onClick={() => {
                  setIsSaveModalOpen(() => true);
                }}
              >
                {i18n.translate('xpack.observabilityAiAssistant.lensFunction.save', {
                  defaultMessage: 'Save',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <lens.EmbeddableComponent
            {...lensEmbeddableInput}
            style={{
              height: 240,
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {isSaveModalOpen ? (
        <lens.SaveModalComponent
          initialInput={lensEmbeddableInput}
          onClose={() => {
            setIsSaveModalOpen(() => false);
          }}
        />
      ) : null}
    </>
  );
}

export function registerLensRenderFunction({
  registerRenderFunction,
  pluginsStart,
}: {
  registerRenderFunction: RegisterRenderFunctionDefinition;
  pluginsStart: ObservabilityAIAssistantAppPluginStartDependencies;
}) {
  registerRenderFunction(
    'lens',
    ({
      arguments: { layers, indexPattern, breakdown, seriesType, start, end, timeField },
    }: Parameters<RenderFunction<LensFunctionArguments, {}>>[0]) => {
      const xyDataLayer: LensSeriesLayer = {
        type: 'series',
        seriesType: seriesType as LensSeriesLayer['seriesType'],
        breakdown: breakdown ? { type: 'topValues', size: 10, field: breakdown.field } : undefined,
        yAxis: layers.map((layer) => ({
          type: 'formula',
          value: layer.formula,
          label: layer.label,
          format: layer.format.id,
          filter: layer.filter ?? '',
        })),
      };

      if (!timeField) return;

      return (
        <Lens
          indexPattern={indexPattern}
          xyDataLayer={xyDataLayer}
          start={start}
          end={end}
          lens={pluginsStart.lens}
          dataViews={pluginsStart.dataViews}
          timeField={timeField}
        />
      );
    }
  );
}
