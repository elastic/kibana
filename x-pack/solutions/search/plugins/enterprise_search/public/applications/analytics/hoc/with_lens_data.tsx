/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo } from 'react';

import { useValues } from 'kea';

import { EuiFlexItem } from '@elastic/eui';
import { BrushTriggerEvent } from '@kbn/charts-plugin/public';
import { DataView } from '@kbn/data-views-plugin/common';

import { TimeRange } from '@kbn/es-query';
import { DefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import { FormulaPublicApi, TypedLensByValueInput } from '@kbn/lens-plugin/public';

import { AnalyticsCollection } from '../../../../common/types/analytics';

import { KibanaLogic } from '../../shared/kibana';
import { findOrCreateDataView } from '../utils/find_or_create_data_view';

export interface WithLensDataInputProps {
  collection: AnalyticsCollection;
  id: string;
  searchSessionId?: string;
  setTimeRange?(timeRange: TimeRange): void;
  timeRange: TimeRange;
}

interface WithLensDataParams<Props, OutputState> {
  dataLoadTransform: (
    isLoading: boolean,
    adapters?: Partial<DefaultInspectorAdapters>
  ) => OutputState;
  getAttributes: (
    dataView: DataView,
    formulaApi: FormulaPublicApi,
    props: Props
  ) => TypedLensByValueInput['attributes'];
  initialValues: OutputState;
}

export const withLensData = <T extends {} = {}, OutputState extends {} = {}>(
  Component: React.FC<T & OutputState>,
  {
    dataLoadTransform,
    getAttributes,
    initialValues,
  }: WithLensDataParams<Omit<T, keyof OutputState>, OutputState>
) => {
  const ComponentWithLensData: React.FC<T & WithLensDataInputProps> = (props) => {
    const { lens } = useValues(KibanaLogic);
    const [dataView, setDataView] = useState<DataView | null>(null);
    const [data, setData] = useState<OutputState>(initialValues);
    const [formula, setFormula] = useState<FormulaPublicApi | null>(null);
    const attributes = useMemo(
      () => dataView && formula && getAttributes(dataView, formula, props),
      [dataView, formula, props]
    );
    const handleBrushEnd = ({ range }: BrushTriggerEvent['data']) => {
      const [min, max] = range;

      props.setTimeRange?.({
        from: new Date(min).toISOString(),
        mode: 'absolute',
        to: new Date(max).toISOString(),
      });
    };

    useEffect(() => {
      (async () => {
        setDataView(await findOrCreateDataView(props.collection));
      })();
    }, [props]);
    useEffect(() => {
      (async () => {
        if (lens?.stateHelperApi) {
          const helper = await lens.stateHelperApi();
          setFormula(helper.formula);
        }
      })();
    }, []);

    if (!lens) return null;

    const { EmbeddableComponent } = lens;
    return (
      <>
        <Component {...(props as T)} {...data} />
        {attributes && (
          <EuiFlexItem css={{ display: 'none' }}>
            <EmbeddableComponent
              id={props.id}
              timeRange={props.timeRange}
              attributes={attributes}
              searchSessionId={props?.searchSessionId}
              onBrushEnd={handleBrushEnd}
              onLoad={(isLoading, adapters) => {
                if (dataLoadTransform) {
                  setData(dataLoadTransform(isLoading, adapters));
                }
              }}
            />
          </EuiFlexItem>
        )}
      </>
    );
  };
  ComponentWithLensData.displayName = `withLensDataHOC(${Component.displayName || Component.name})`;

  return ComponentWithLensData;
};
