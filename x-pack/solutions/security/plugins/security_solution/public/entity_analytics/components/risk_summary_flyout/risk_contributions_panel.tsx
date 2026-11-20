/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBasicTable, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { InspectButton, InspectButtonContainer } from '../../../common/components/inspect';
import { VisualizationEmbeddable } from '../../../common/components/visualization_actions/visualization_embeddable';
import type {
  LensAttributes,
  VisualizationEmbeddableProps,
} from '../../../common/components/visualization_actions/types';
import type { ExpandablePanelPanelProps } from '../../../flyout_v2/shared/components/expandable_panel';
import { ExpandablePanel } from '../../../flyout_v2/shared/components/expandable_panel';
import type { getItems } from './common';
import {
  columnsArray,
  LENS_VISUALIZATION_HEIGHT,
  LENS_VISUALIZATION_MIN_WIDTH,
  SUMMARY_TABLE_MIN_WIDTH,
} from './common';

export interface RiskContributionsPanelProps {
  'data-test-subj': string;
  title: React.ReactNode;
  link?: ExpandablePanelPanelProps['header']['link'];
  iconType?: ExpandablePanelPanelProps['header']['iconType'];
  visualization: {
    /** Only render the embeddable once the underlying risk data is available. */
    isReady: boolean;
    id: string;
    lensAttributes?: LensAttributes;
    timerange: VisualizationEmbeddableProps['timerange'];
    inspectTitle: React.ReactNode;
    casesAttachmentMetadata: VisualizationEmbeddableProps['casesAttachmentMetadata'];
  };
  table: {
    testSubj: string;
    caption: string;
    items: ReturnType<typeof getItems>;
    loading: boolean;
    inspectQueryId?: string;
  };
}

/**
 * A risk score visualization next to its risk contributions table, wrapped in an expandable panel.
 */
export const RiskContributionsPanel: React.FC<RiskContributionsPanelProps> = ({
  'data-test-subj': dataTestSubj,
  title,
  link,
  iconType,
  visualization,
  table,
}) => {
  const { isReady, id, lensAttributes, timerange, inspectTitle, casesAttachmentMetadata } =
    visualization;

  return (
    <ExpandablePanel
      data-test-subj={dataTestSubj}
      header={{ title, link, iconType }}
      expand={{
        expandable: false,
      }}
    >
      <EuiFlexGroup gutterSize="m" direction="row" wrap>
        <EuiFlexItem grow={1}>
          <div
            // Improve Visualization loading state by predefining the size
            // Set min-width for a fluid layout
            css={css`
              height: ${LENS_VISUALIZATION_HEIGHT}px;
              min-width: ${LENS_VISUALIZATION_MIN_WIDTH}px;
            `}
          >
            {isReady && lensAttributes && (
              <VisualizationEmbeddable
                applyGlobalQueriesAndFilters={false}
                applyPageAndTabsFilters={false}
                lensAttributes={lensAttributes}
                id={id}
                timerange={timerange}
                width={'100%'}
                height={LENS_VISUALIZATION_HEIGHT}
                disableOnClickFilter
                inspectTitle={inspectTitle}
                casesAttachmentMetadata={casesAttachmentMetadata}
              />
            )}
          </div>
        </EuiFlexItem>
        <RiskContributionsTable {...table} />
      </EuiFlexGroup>
    </ExpandablePanel>
  );
};

const RiskContributionsTable = ({
  testSubj,
  caption,
  items,
  loading,
  inspectQueryId,
}: RiskContributionsPanelProps['table']) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexItem
      grow={3}
      css={css`
        min-width: ${SUMMARY_TABLE_MIN_WIDTH}px;
      `}
    >
      <InspectButtonContainer>
        <div
          css={css`
            position: relative;
          `}
        >
          {inspectQueryId != null && (
            <div
              css={css`
                position: absolute;
                right: 0;
                top: -${euiTheme.size.base};
              `}
            >
              <InspectButton
                queryId={inspectQueryId}
                title={
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.entityDetails.inspectTableTitle"
                    defaultMessage="Risk Summary Table"
                  />
                }
              />
            </div>
          )}
          <EuiBasicTable
            tableCaption={caption}
            data-test-subj={testSubj}
            responsiveBreakpoint={false}
            columns={columnsArray}
            items={items}
            compressed
            loading={loading}
          />
        </div>
      </InspectButtonContainer>
    </EuiFlexItem>
  );
};
