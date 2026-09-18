/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow, EuiLink } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo } from 'react';

import { getFriendlyNameForPartitionId } from '../../../../common/log_analysis';
import { INFRA_EBT_ACTIONS, INFRA_EBT_ELEMENTS } from '../../../common/ebt_constants';

type DatasetOptionProps = EuiComboBoxOptionOption<string>;

export const DatasetsSelector: React.FunctionComponent<{
  availableDatasets: string[];
  isLoading?: boolean;
  hasFailedLoading?: boolean;
  onRetry?: () => void;
  onChangeDatasetSelection: (datasets: string[]) => void;
  selectedDatasets: string[];
}> = ({
  availableDatasets,
  isLoading = false,
  hasFailedLoading = false,
  onRetry,
  onChangeDatasetSelection,
  selectedDatasets,
}) => {
  const options = useMemo<DatasetOptionProps[]>(() => {
    const allDatasets = [...new Set([...availableDatasets, ...selectedDatasets])];
    return allDatasets.map((dataset) => ({
      value: dataset,
      label: getFriendlyNameForPartitionId(dataset),
    }));
  }, [availableDatasets, selectedDatasets]);

  const selectedOptions = useMemo(
    () => options.filter(({ value }) => value != null && selectedDatasets.includes(value)),
    [options, selectedDatasets]
  );

  const handleChange = useCallback(
    (newSelectedOptions: DatasetOptionProps[]) =>
      onChangeDatasetSelection(newSelectedOptions.map(({ value }) => value).filter(isDefined)),
    [onChangeDatasetSelection]
  );

  const loadingFailureMessage = hasFailedLoading ? (
    <>
      {datasetFilterLoadingFailureMessage}{' '}
      {onRetry ? (
        <EuiLink
          color="danger"
          onClick={onRetry}
          data-test-subj="infraDatasetsSelectorRetryLink"
          {...getEbtProps({
            action: INFRA_EBT_ACTIONS.RETRY_LOAD,
            element: INFRA_EBT_ELEMENTS.LOG_ANALYSIS_DATASETS_SELECTOR,
          })}
        >
          {datasetFilterLoadingFailureRetryLinkLabel}
        </EuiLink>
      ) : null}
    </>
  ) : undefined;

  return (
    <EuiFormRow isInvalid={hasFailedLoading} error={loadingFailureMessage}>
      <EuiComboBox
        aria-label={datasetFilterPlaceholder}
        isDisabled={hasFailedLoading}
        isInvalid={hasFailedLoading}
        isLoading={isLoading}
        onChange={handleChange}
        options={hasFailedLoading ? noOptions : options}
        placeholder={datasetFilterPlaceholder}
        selectedOptions={selectedOptions}
      />
    </EuiFormRow>
  );
};

const datasetFilterPlaceholder = i18n.translate(
  'xpack.infra.logs.analysis.datasetFilterPlaceholder',
  {
    defaultMessage: 'Filter by datasets',
  }
);

const datasetFilterLoadingFailureMessage = i18n.translate(
  'xpack.infra.logs.analysis.datasetFilterLoadingFailure',
  {
    defaultMessage: 'Failed to load datasets.',
  }
);

const datasetFilterLoadingFailureRetryLinkLabel = i18n.translate(
  'xpack.infra.logs.analysis.datasetFilterLoadingFailureRetryLinkLabel',
  {
    defaultMessage: 'Retry',
  }
);

const noOptions: DatasetOptionProps[] = [];

const isDefined = <Value extends any>(value: Value): value is NonNullable<Value> => value != null;
