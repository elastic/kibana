/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { FormattedMessage } from '@kbn/i18n-react';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { RangeFilterParams } from '@kbn/es-query';
import type { ClickTriggerEvent, MultiClickTriggerEvent } from '@kbn/charts-plugin/public';
import type {
  EmbeddableComponentProps,
  TypedLensByValueInput,
  XYState,
} from '@kbn/lens-plugin/public';
import { css } from '@emotion/react';
import { setAbsoluteRangeDatePicker } from '../../store/inputs/actions';
import { useKibana } from '../../lib/kibana';
import { useLensAttributes } from './use_lens_attributes';
import type { LensEmbeddableComponentProps } from './types';
import { DEFAULT_ACTIONS, useActions } from './use_actions';

import { ModalInspectQuery } from '../inspect/modal';
import { InputsModelId } from '../../store/inputs/constants';
import { SourcererScopeName } from '../../../sourcerer/store/model';
import { VisualizationActions } from './actions';
import { useEmbeddableInspect } from './use_embeddable_inspect';
import { useVisualizationResponse } from './use_visualization_response';
import { useInspect } from '../inspect/use_inspect';

const DISABLED_ACTIONS = ['ACTION_CUSTOMIZE_PANEL'];

const getStyles = (width?: string | number, height?: number) => {
  return {
    lensComponentWrapper: css({
      height: height ? `${height}px` : 'auto',
      width: width ?? 'auto',
      '.expExpressionRenderer__expression': {
        padding: '2px 0 0 0 !important',
      },
      '.legacyMtrVis__container': {
        padding: 0,
      },
    }),
  };
};

const LensEmbeddableComponent: React.FC<LensEmbeddableComponentProps> = ({
  applyGlobalQueriesAndFilters = true,
  applyPageAndTabsFilters = true,
  extraActions,
  extraOptions,
  getLensAttributes,
  height: wrapperHeight,
  id,
  inputsModelId = InputsModelId.global,
  inspectTitle,
  lensAttributes,
  onLoad,
  scopeId = SourcererScopeName.default,
  enableLegendActions = true,
  stackByField,
  timerange,
  width: wrapperWidth,
  withActions = DEFAULT_ACTIONS,
  disableOnClickFilter = false,
  casesAttachmentMetadata,
}) => {
  const styles = useMemo(
    () => getStyles(wrapperWidth, wrapperHeight),
    [wrapperWidth, wrapperHeight]
  );

  const lensComponentStyle = useMemo(
    () => ({
      height: wrapperHeight ?? '100%',
      minWidth: '100px',
      width: wrapperWidth ?? '100%',
    }),
    [wrapperHeight, wrapperWidth]
  );

  const {
    lens,
    data: {
      actions: { createFiltersFromValueClickAction },
    },
  } = useKibana().services;
  const dispatch = useDispatch();
  const { searchSessionId } = useVisualizationResponse({ visualizationId: id });
  const attributes = useLensAttributes({
    applyGlobalQueriesAndFilters,
    applyPageAndTabsFilters,
    extraOptions,
    getLensAttributes,
    lensAttributes,
    scopeId,
    stackByField,
    title: '',
  });
  const preferredSeriesType = (attributes?.state?.visualization as XYState)?.preferredSeriesType;

  const LensComponent = lens.EmbeddableComponent;

  const overrides: TypedLensByValueInput['overrides'] = useMemo(
    () =>
      enableLegendActions
        ? undefined
        : { settings: { legendAction: 'ignore', onBrushEnd: 'ignore' } },
    [enableLegendActions]
  );
  const { setInspectData } = useEmbeddableInspect(onLoad);
  const { responses, loading } = useVisualizationResponse({ visualizationId: id });

  const {
    additionalRequests,
    additionalResponses,
    handleClick: handleInspectClick,
    handleCloseModal,
    isButtonDisabled: isInspectButtonDisabled,
    isShowingModal,
    request,
    response,
  } = useInspect({
    inputId: inputsModelId,
    isDisabled: loading,
    multiple: responses != null && responses.length > 1,
    queryId: id,
  });

  const inspectActionProps = useMemo(
    () => ({
      handleInspectClick,
      isInspectButtonDisabled,
    }),
    [handleInspectClick, isInspectButtonDisabled]
  );

  const actions = useActions({
    attributes,
    extraActions,
    inspectActionProps,
    timeRange: timerange,
    withActions,
    lensMetadata: casesAttachmentMetadata,
  });

  const updateDateRange = useCallback(
    ({ range }: { range: Array<number | string> }) => {
      const [min, max] = range;
      dispatch(
        setAbsoluteRangeDatePicker({
          id: inputsModelId,
          from: new Date(min).toISOString(),
          to: new Date(max).toISOString(),
        })
      );
    },
    [dispatch, inputsModelId]
  );

  const onFilterCallback = useCallback<Required<TypedLensByValueInput>['onFilter']>(
    (event) => {
      if (disableOnClickFilter) {
        event.preventDefault();
        return;
      }
      const callback: EmbeddableComponentProps['onFilter'] = async (e) => {
        if (!isClickTriggerEvent(e) || preferredSeriesType !== 'area') {
          e.preventDefault();
          return;
        }
        // Update timerange when clicking on a dot in an area chart
        const [{ query }] = await createFiltersFromValueClickAction({
          data: e.data,
          negate: e.negate,
        });
        const rangeFilter: RangeFilterParams = query?.range['@timestamp'];
        if (rangeFilter?.gte && rangeFilter?.lt) {
          updateDateRange({
            range: [rangeFilter.gte, rangeFilter.lt],
          });
        }
      };
      return callback;
    },
    [createFiltersFromValueClickAction, updateDateRange, preferredSeriesType, disableOnClickFilter]
  );

  const adHocDataViews = useMemo(
    () =>
      attributes?.state?.adHocDataViews != null
        ? Object.values(attributes?.state?.adHocDataViews).reduce((acc, adHocDataView) => {
            if (adHocDataView?.name != null) {
              acc.push(adHocDataView?.name);
            }
            return acc;
          }, [] as string[])
        : null,
    [attributes?.state?.adHocDataViews]
  );

  if (!searchSessionId) {
    return null;
  }

  if (!attributes || (responses != null && responses.length === 0)) {
    return (
      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <EuiEmptyPrompt
            body={
              <EuiText size="xs">
                <FormattedMessage
                  id="xpack.securitySolution.lensEmbeddable.NoDataToDisplay.title"
                  defaultMessage="No data to display"
                />
              </EuiText>
            }
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <VisualizationActions
            extraActions={extraActions}
            getLensAttributes={getLensAttributes}
            inputId={inputsModelId}
            isInspectButtonDisabled={true}
            lensAttributes={attributes}
            queryId={id}
            stackByField={stackByField}
            timerange={timerange}
            title={inspectTitle}
            withActions={withActions}
            casesAttachmentMetadata={casesAttachmentMetadata}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <>
      {attributes && searchSessionId && (
        <div css={styles.lensComponentWrapper}>
          <LensComponent
            attributes={attributes}
            disabledActions={DISABLED_ACTIONS}
            extraActions={actions}
            id={id}
            onBrushEnd={updateDateRange}
            onFilter={onFilterCallback}
            onLoad={setInspectData}
            overrides={overrides}
            searchSessionId={searchSessionId}
            showInspector={false}
            style={lensComponentStyle}
            syncCursor={false}
            syncTooltips={false}
            timeRange={timerange}
            viewMode={ViewMode.VIEW}
            withDefaultActions={false}
          />
        </div>
      )}
      {isShowingModal && request != null && response != null && (
        <ModalInspectQuery
          adHocDataViews={adHocDataViews}
          additionalRequests={additionalRequests}
          additionalResponses={additionalResponses}
          closeModal={handleCloseModal}
          data-test-subj="inspect-modal"
          inputId={inputsModelId}
          request={request}
          response={response}
          title={inspectTitle}
        />
      )}
    </>
  );
};

const isClickTriggerEvent = (
  e: ClickTriggerEvent['data'] | MultiClickTriggerEvent['data']
): e is ClickTriggerEvent['data'] => {
  return Array.isArray(e.data) && 'column' in e.data[0];
};

export const LensEmbeddable = React.memo(LensEmbeddableComponent);
