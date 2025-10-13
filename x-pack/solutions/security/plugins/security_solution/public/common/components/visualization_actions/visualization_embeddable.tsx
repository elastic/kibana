/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { css } from '@emotion/react';

import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { ChartLabel } from '../../../overview/components/detection_response/alerts_by_status/chart_label';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { inputsActions, inputsSelectors } from '../../store/inputs';
import { DonutChartWrapper } from '../charts/donutchart';
import { InputsModelId } from '../../store/inputs/constants';
import { useRefetchByRestartingSession } from '../page/use_refetch_by_session';
import { LensEmbeddable } from './lens_embeddable';
import type { EmbeddableData, VisualizationEmbeddableProps } from './types';
import { useVisualizationResponse } from './use_visualization_response';

const VisualizationEmbeddableComponent: React.FC<VisualizationEmbeddableProps> = (props) => {
  const dispatch = useDispatch();
  const {
    inputId = InputsModelId.global,
    id,
    isDonut,
    label,
    donutTextWrapperClassName,
    donutTitleLabel,
    onLoad,
    signalIndexName,
    ...lensProps
  } = props;
  const { session, refetchByRestartingSession, refetchByDeletingSession } =
    useRefetchByRestartingSession({
      inputId,
      queryId: id,
    });

  const { dataView } = useDataView(lensProps.scopeId);
  const indicesExist = dataView.hasMatchedIndices();

  const memorizedTimerange = useRef(lensProps.timerange);
  const getGlobalQuery = useMemo(() => inputsSelectors.globalQueryByIdSelector(), []);
  const { searchSessionId } = useDeepEqualSelector((state) => getGlobalQuery(state, id));
  const { tables: visualizationTables } = useVisualizationResponse({
    visualizationId: id,
  });
  const visualizationTablesTotalCount: number | undefined =
    visualizationTables && visualizationTables.meta.statistics.totalCount;
  const dataExists = visualizationTablesTotalCount != null && visualizationTablesTotalCount > 0;
  const donutTextWrapperStyles = dataExists
    ? css`
        top: 40%;
        right: 12%;
      `
    : css`
        top: 66%;
        right: 12%;
      `;
  const onEmbeddableLoad = useCallback(
    ({ requests, responses, isLoading, tables }: EmbeddableData) => {
      dispatch(
        inputsActions.setQuery({
          inputId,
          id,
          searchSessionId: session.current.start(),
          refetch: refetchByRestartingSession,
          loading: isLoading,
          inspect: isLoading ? null : { dsl: requests, response: responses },
          tables,
        })
      );

      if (typeof onLoad === 'function') {
        onLoad({ requests, responses, isLoading, tables });
      }
    },
    [dispatch, inputId, id, session, refetchByRestartingSession, onLoad]
  );

  useEffect(() => {
    // This handles timerange update when (alert) indices not found
    if (
      (!indicesExist && memorizedTimerange.current?.from !== lensProps.timerange.from) ||
      memorizedTimerange.current?.to !== lensProps.timerange.to
    ) {
      memorizedTimerange.current = lensProps.timerange;
      dispatch(inputsActions.deleteOneQuery({ inputId, id }));
    }
  }, [dispatch, id, indicesExist, inputId, lensProps.timerange]);

  useEffect(() => {
    // This handles initial mount and refetch when (alert) indices not found
    if (!searchSessionId) {
      dispatch(
        inputsActions.setQuery({
          inputId,
          id,
          searchSessionId: session.current.start(),
          refetch: dataExists ? refetchByRestartingSession : refetchByDeletingSession,
          loading: false,
          inspect: null,
        })
      );
    }
  }, [
    dispatch,
    inputId,
    id,
    session,
    dataExists,
    refetchByRestartingSession,
    searchSessionId,
    refetchByDeletingSession,
  ]);

  useEffect(() => {
    return () => {
      dispatch(inputsActions.deleteOneQuery({ inputId, id }));
    };
  }, [dispatch, id, inputId]);

  if ((!lensProps.getLensAttributes && !lensProps.lensAttributes) || !lensProps.timerange) {
    return null;
  }

  if (isDonut) {
    return (
      <DonutChartWrapper
        isChartEmbeddablesEnabled={true}
        dataExists={dataExists}
        label={label}
        title={
          visualizationTablesTotalCount != null ? (
            <>
              {donutTitleLabel && <span className="donutTitleLabel">{donutTitleLabel}</span>}
              <ChartLabel count={visualizationTablesTotalCount} />
            </>
          ) : null
        }
        donutTextWrapperClassName={donutTextWrapperClassName}
        donutTextWrapperStyles={donutTextWrapperStyles}
      >
        <LensEmbeddable
          {...lensProps}
          signalIndexName={signalIndexName}
          id={id}
          onLoad={onEmbeddableLoad}
        />
      </DonutChartWrapper>
    );
  }

  return (
    <LensEmbeddable
      {...lensProps}
      signalIndexName={signalIndexName}
      id={id}
      onLoad={onEmbeddableLoad}
    />
  );
};

export const VisualizationEmbeddable = React.memo(VisualizationEmbeddableComponent);
