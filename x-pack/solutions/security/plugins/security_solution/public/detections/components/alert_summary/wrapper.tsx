/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import {
  EuiEmptyPrompt,
  EuiHorizontalRule,
  EuiSkeletonLoading,
  EuiSkeletonRectangle,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import type { RuleResponse } from '../../../../common/api/detection_engine';
import { KPIsSection } from './kpis/kpis_section';
import { IntegrationSection } from './integrations/integration_section';
import { SearchBarSection } from './search_bar/search_bar_section';
import { TableSection } from './table/table_section';
import { useCreateDataView } from '../../../common/hooks/use_create_data_view';
import { SourcererScopeName } from '../../../sourcerer/store/model';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { DEFAULT_ALERTS_INDEX } from '../../../../common/constants';

const DATAVIEW_ERROR = i18n.translate('xpack.securitySolution.alertSummary.dataViewError', {
  defaultMessage: 'Unable to create data view',
});

export const DATA_VIEW_LOADING_PROMPT_TEST_ID = 'alert-summary-data-view-loading-prompt';
export const DATA_VIEW_ERROR_TEST_ID = 'alert-summary-data-view-error';
export const SKELETON_TEST_ID = 'alert-summary-skeleton';
export const CONTENT_TEST_ID = 'alert-summary-content';

export interface WrapperProps {
  /**
   * List of installed AI for SOC integrations
   */
  packages: PackageListItem[];
  /**
   * Result from the useQuery to fetch all rules
   */
  ruleResponse: {
    /**
     * Result from fetching all rules
     */
    rules: RuleResponse[];
    /**
     * True while rules are being fetched
     */
    isLoading: boolean;
  };
}

/**
 * Creates a new adhoc dataView for the alert summary page. The dataView is created just with the alert indices.
 * During the creating, we display a loading skeleton, mimicking the future alert summary page content.
 * Once the dataView is correctly created, we render the content.
 * If the creation fails, we show an error message.
 */
export const Wrapper = memo(({ packages, ruleResponse }: WrapperProps) => {
  const spaceId = useSpaceId();
  const oldSignalIndexName = `${DEFAULT_ALERTS_INDEX}-${spaceId}`;
  const dataViewSpec = useMemo(() => ({ title: oldSignalIndexName }), [oldSignalIndexName]);

  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');

  const { dataView: oldDataView, loading: oldDataViewLoading } = useCreateDataView({
    dataViewSpec,
    skip: newDataViewPickerEnabled, // skip data view creation if the new data view picker is enabled
  });

  const { dataView: experimentalDataView, status } = useDataView(SourcererScopeName.detections);
  const signalIndexName = newDataViewPickerEnabled
    ? experimentalDataView?.getIndexPattern() ?? ''
    : oldSignalIndexName;
  const loading = newDataViewPickerEnabled ? status !== 'ready' : oldDataViewLoading;
  const dataView = newDataViewPickerEnabled ? experimentalDataView : oldDataView;

  return (
    <EuiSkeletonLoading
      data-test-subj={DATA_VIEW_LOADING_PROMPT_TEST_ID}
      isLoading={loading}
      loadingContent={
        <div data-test-subj={SKELETON_TEST_ID}>
          <EuiSkeletonRectangle height={50} width="100%" />
          <EuiHorizontalRule />
          <EuiSkeletonRectangle height={50} width="100%" />
          <EuiSpacer />
          <EuiSkeletonRectangle height={275} width="100%" />
          <EuiSpacer />
          <EuiSkeletonRectangle height={600} width="100%" />
        </div>
      }
      loadedContent={
        <>
          {!dataView || !dataView.id ? (
            <EuiEmptyPrompt
              color="danger"
              data-test-subj={DATA_VIEW_ERROR_TEST_ID}
              iconType="error"
              title={<h2>{DATAVIEW_ERROR}</h2>}
            />
          ) : (
            <div data-test-subj={CONTENT_TEST_ID}>
              <IntegrationSection packages={packages} />
              <EuiHorizontalRule />
              <SearchBarSection
                dataView={dataView}
                packages={packages}
                ruleResponse={ruleResponse}
              />
              <EuiSpacer />
              <KPIsSection signalIndexName={signalIndexName} />
              <EuiSpacer />
              <TableSection dataView={dataView} packages={packages} ruleResponse={ruleResponse} />
            </div>
          )}
        </>
      }
    />
  );
});

Wrapper.displayName = 'Wrapper';
