/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import type { DataViewBase } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { TableId } from '@kbn/securitysolution-data-table';
import { PageScope } from '../../../../data_view_manager/constants';
import { AlertTableCellContextProvider } from '../../../../detections/configurations/security_solution_detections/cell_value_context';
import { StatefulEventsViewer } from '../../../../common/components/events_viewer';
import { defaultRowRenderers } from '../../../../timelines/components/timeline/body/renderers';
import { getAlertsPreviewDefaultModel } from '../../../../detections/components/alerts_table/default_config';
import { DEFAULT_PREVIEW_INDEX } from '../../../../../common/constants';
import { useGlobalFullScreen } from '../../../../common/containers/use_full_screen';
import { useLicense } from '../../../../common/hooks/use_license';
import { useKibana } from '../../../../common/lib/kibana';
import type { TimeframePreviewOptions } from '../../../common/types';
import { PreviewRenderCellValue } from './preview_table_cell_renderer';
import { getPreviewTableControlColumn } from './preview_table_control_columns';

const RULE_PREVIEW_ID_FIELD = 'kibana.alert.rule.uuid';

export interface RulePreviewAlertsTableProps {
  previewId: string;
  spaceId: string;
  indexPattern: DataViewBase | undefined;
  timeframeOptions: TimeframePreviewOptions;
  dataTableId?: string;
}

const RulePreviewAlertsTableComponent: React.FC<RulePreviewAlertsTableProps> = ({
  previewId,
  spaceId,
  indexPattern,
  timeframeOptions,
  dataTableId,
}) => {
  const { uiSettings } = useKibana().services;
  const license = useLicense();
  const { globalFullScreen } = useGlobalFullScreen();

  const startDate = useMemo(
    () => timeframeOptions.timeframeStart.toISOString(),
    [timeframeOptions]
  );

  // It seems like the Table/Grid component uses end date value as a non-inclusive one,
  // thus the alerts which have timestamp equal to the end date value are not displayed in the table.
  // To fix that, we extend end date value by 1s to make sure all alerts are included in the table.
  const extendedEndDate = useMemo(
    () => timeframeOptions.timeframeEnd.clone().add('1', 's').toISOString(),
    [timeframeOptions]
  );

  const pageFilters = useMemo(() => {
    const filterQuery = buildEsQuery(
      indexPattern,
      [{ query: `${RULE_PREVIEW_ID_FIELD}:${previewId}`, language: 'kuery' }],
      [],
      {
        nestedIgnoreUnmapped: true,
        ...getEsQueryConfig(uiSettings),
        dateFormatTZ: undefined,
      }
    );
    return [
      {
        ...filterQuery,
        meta: {
          alias: null,
          negate: false,
          disabled: false,
          type: 'phrase',
          key: RULE_PREVIEW_ID_FIELD,
          params: {
            query: previewId,
          },
        },
      },
    ];
  }, [uiSettings, indexPattern, previewId]);

  return (
    <AlertTableCellContextProvider tableId={TableId.rulePreview} sourcererScope={PageScope.alerts}>
      <div
        css={css({
          height: globalFullScreen ? '100%' : undefined,
          width: '100%',
        })}
      >
        <StatefulEventsViewer
          dataTableId={dataTableId}
          pageFilters={pageFilters}
          defaultModel={getAlertsPreviewDefaultModel(license)}
          end={extendedEndDate}
          tableId={TableId.rulePreview}
          leadingControlColumns={getPreviewTableControlColumn(1.5)}
          renderCellValue={PreviewRenderCellValue}
          rowRenderers={defaultRowRenderers}
          start={startDate}
          pageScope={PageScope.alerts}
          indexNames={[`${DEFAULT_PREVIEW_INDEX}-${spaceId}`]}
          bulkActions={false}
        />
      </div>
    </AlertTableCellContextProvider>
  );
};

export const RulePreviewAlertsTable = React.memo(RulePreviewAlertsTableComponent);
RulePreviewAlertsTable.displayName = 'RulePreviewAlertsTable';
