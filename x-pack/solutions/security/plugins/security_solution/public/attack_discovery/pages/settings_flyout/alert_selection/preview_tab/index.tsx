/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter, Query, TimeRange } from '@kbn/es-query';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiEmptyPrompt,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';

import { useEuiComboBoxReset } from '../../../../../common/components/use_combo_box_reset';
import { StackByComboBox } from '../../../../../detections/components/alerts_kpis/common/components';
import { useSignalIndex } from '../../../../../detections/containers/detection_engine/alerts/use_signal_index';
import type { LensAttributes } from '../../../../../common/components/visualization_actions/types';
import { useKibana } from '../../../../../common/lib/kibana';
import * as i18n from '../translations';
import type { Sorting } from '../types';

export const ATTACK_DISCOVERY_SETTINGS_ALERTS_COUNT_ID = 'attack-discovery-settings-alerts-count';
export const RESET_FIELD = 'kibana.alert.rule.name';

const DEFAULT_DATA_TEST_SUBJ = 'previewTab';
const VIEW_MODE = 'view';

interface Props {
  dataTestSubj?: string;
  embeddableId: string;
  end: string;
  filters: Filter[];
  getLensAttributes: ({
    defaultPageSize,
    esqlQuery,
    sorting,
    tableStackBy0,
  }: {
    defaultPageSize?: number;
    esqlQuery: string;
    sorting?: Sorting;
    tableStackBy0: string;
  }) => LensAttributes;
  getPreviewEsqlQuery: ({
    alertsIndexPattern,
    maxAlerts,
    tableStackBy0,
  }: {
    alertsIndexPattern: string;
    maxAlerts: number;
    tableStackBy0: string;
  }) => string;
  maxAlerts: number;
  query: Query;
  setTableStackBy0: React.Dispatch<React.SetStateAction<string>>;
  sorting?: Sorting;
  start: string;
  tableStackBy0: string;
}

const PreviewTabComponent = ({
  dataTestSubj = DEFAULT_DATA_TEST_SUBJ,
  embeddableId,
  end,
  filters,
  getLensAttributes,
  getPreviewEsqlQuery,
  maxAlerts,
  query,
  setTableStackBy0,
  sorting,
  start,
  tableStackBy0,
}: Props) => {
  const { lens } = useKibana().services;
  const {
    euiTheme: { font },
  } = useEuiTheme();

  const { signalIndexName } = useSignalIndex();

  const {
    comboboxRef: stackByField0ComboboxRef,
    setComboboxInputRef: setStackByField0ComboboxInputRef,
  } = useEuiComboBoxReset();

  const onSelect = useCallback((value: string) => setTableStackBy0(value), [setTableStackBy0]);

  const timeRange: TimeRange = useMemo(() => ({ from: start, to: end }), [end, start]);

  const esqlQuery = useMemo(
    () =>
      getPreviewEsqlQuery({
        alertsIndexPattern: signalIndexName ?? '',
        maxAlerts,
        tableStackBy0,
      }),
    [getPreviewEsqlQuery, maxAlerts, signalIndexName, tableStackBy0]
  );

  const attributes = useMemo(
    () =>
      getLensAttributes({
        esqlQuery,
        sorting,
        tableStackBy0: tableStackBy0.trim(),
      }),
    [esqlQuery, getLensAttributes, sorting, tableStackBy0]
  );

  const onReset = useCallback(() => setTableStackBy0(RESET_FIELD), [setTableStackBy0]);

  const actions = useMemo(
    () => [
      <EuiButtonEmpty color="primary" data-test-subj="reset" onClick={onReset}>
        {i18n.RESET}
      </EuiButtonEmpty>,
    ],
    [onReset]
  );

  const body = useMemo(
    () => (
      <EuiText data-test-subj="body" size="s">
        {i18n.SELECT_A_FIELD}
      </EuiText>
    ),
    []
  );

  const EmptyPrompt = useMemo(
    () =>
      isEmpty(tableStackBy0.trim()) ? (
        <EuiEmptyPrompt data-test-subj="emptyPrompt" actions={actions} body={body} />
      ) : null,
    [actions, body, tableStackBy0]
  );

  if (signalIndexName == null) {
    return null;
  }

  return (
    <EuiFlexGroup data-test-subj={dataTestSubj} direction="column" gutterSize="none">
      <EuiFlexItem grow={false}>
        <StackByComboBox
          aria-label={i18n.SELECT_FIELD}
          data-test-subj="selectField"
          inputRef={setStackByField0ComboboxInputRef}
          onSelect={onSelect}
          prepend={''}
          ref={stackByField0ComboboxRef}
          selected={tableStackBy0}
          useLensCompatibleFields={true}
        />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiSpacer size="s" />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        {EmptyPrompt ??
          (attributes && (
            <div
              css={`
                .euiDataGridHeader {
                  background: none;
                  border-top: none;
                }

                .euiDataGridHeaderCell {
                  font-size: ${font.scale.s}${font.defaultUnits};
                }

                .euiDataGridFooter {
                  background: none;
                }

                .euiDataGridRowCell {
                  font-size: ${font.scale.s}${font.defaultUnits};
                }

                .expExpressionRenderer__expression {
                  padding: 0 !important;
                }
              `}
              data-test-subj="embeddableContainer"
            >
              <lens.EmbeddableComponent
                attributes={attributes}
                disableTriggers={false}
                filters={filters}
                hidePanelTitles={true}
                id={embeddableId}
                query={query}
                timeRange={timeRange}
                viewMode={VIEW_MODE}
                withDefaultActions={true}
              />
            </div>
          ))}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

PreviewTabComponent.displayName = 'PreviewTab';

export const PreviewTab = React.memo(PreviewTabComponent);
