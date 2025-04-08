/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBasicTable, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { GetRiskScoreSpikesResponse, SpikeEntity } from '../../../common/api/entity_analytics';
import { FlyoutHeader } from '../shared/components/flyout_header';
import { FlyoutBody } from '../shared/components/flyout_body';

export interface RiskScoreSpikeDetailsExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'risk-score-spike-details';
  params: RiskScoreSpikeDetailsPanelProps;
}

export const RiskScoreSpikeDetailsPanelKey: RiskScoreSpikeDetailsExpandableFlyoutProps['key'] =
  'risk-score-spike-details';

export interface RiskScoreSpikeDetailsPanelProps extends Record<string, unknown> {
  spikes: GetRiskScoreSpikesResponse;
}

/**
 * Panel to be displayed in the RiskScoreSpikeDetails details expandable flyout right section
 */
export const RiskScoreSpikeDetailsPanel: FC<RiskScoreSpikeDetailsPanelProps> = memo(
  ({ spikes }) => {
    const { spikesAboveBaseline = [], newScoreSpikes = [] } = spikes;

    const newScoreSpikeColumns: Array<EuiBasicTableColumn<SpikeEntity>> = [
      {
        field: 'identifierKey',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.scoreSpikesCallout.type"
            defaultMessage="Type"
          />
        ),
        truncateText: true,
        render: (field: string, record: SpikeEntity) => {
          let type: string = 'unknown';

          switch (field) {
            case 'user.name':
              type = 'user';
              break;
            case 'host.name':
              type = 'host';
              break;
            case 'service.name':
              type = 'service';
              break;
          }

          return (
            <EuiText
              color="subdued"
              size="s"
              data-test-subj={`score-spikes-callout-${type}-type`}
              data-entity-type={type}
            >
              {type}
            </EuiText>
          );
        },
      },
      {
        field: 'identifier',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.scoreSpikesCallout.name"
            defaultMessage="Name"
          />
        ),
        sortable: true,
        truncateText: true,
      },
      {
        field: 'spike',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.scoreSpikesCallout.score"
            defaultMessage="Score"
          />
        ),
        sortable: true,
        truncateText: true,
      },
    ];

    const spikesAboveBaslineColumns: Array<EuiBasicTableColumn<SpikeEntity>> = [
      {
        field: 'identifierKey',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.scoreSpikesCallout.type"
            defaultMessage="Type"
          />
        ),
        truncateText: true,
        render: (field: string, record: SpikeEntity) => {
          let type: string = 'unknown';

          switch (field) {
            case 'user.name':
              type = 'user';
              break;
            case 'host.name':
              type = 'host';
              break;
            case 'service.name':
              type = 'service';
              break;
          }

          return (
            <EuiText
              color="subdued"
              size="s"
              data-test-subj={`score-spikes-callout-${type}-type`}
              data-entity-type={type}
            >
              {type}
            </EuiText>
          );
        },
      },
      {
        field: 'identifier',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.scoreSpikesCallout.name"
            defaultMessage="Name"
          />
        ),
        sortable: true,
        truncateText: true,
      },
      {
        field: 'baseline',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.scoreSpikesCallout.baseline"
            defaultMessage="Baseline"
          />
        ),
        sortable: true,
        truncateText: true,
      },
      {
        field: 'spike',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.scoreSpikesCallout.spike"
            defaultMessage="Score"
          />
        ),
        sortable: true,
        truncateText: true,
      },
    ];

    return (
      <>
        <FlyoutHeader hasBorder>
          <EuiText>
            <h2>
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.scoreSpikesCallout.spikesTitle"
                defaultMessage="Risk score spikes detected"
              />
            </h2>
          </EuiText>
        </FlyoutHeader>
        <FlyoutBody>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <EuiText>
                <h3>
                  <FormattedMessage
                    id="xpack.securitySolution.entityAnalytics.scoreSpikesCallout.newEntitiesTitle"
                    defaultMessage="New entitities with a high score"
                  />
                </h3>
              </EuiText>
              <EuiBasicTable
                items={newScoreSpikes}
                columns={newScoreSpikeColumns}
                noItemsMessage={
                  <FormattedMessage
                    id="xpack.securitySolution.entityAnalytics.scoreSpikesCallout.noNewEntities"
                    defaultMessage="No new entities with score spikes"
                  />
                }
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText>
                <h3>
                  <FormattedMessage
                    id="xpack.securitySolution.entityAnalytics.scoreSpikesCallout.newEntitiesTitle"
                    defaultMessage="Spikes in risk score"
                  />
                </h3>
              </EuiText>
              <EuiBasicTable
                items={spikesAboveBaseline}
                columns={spikesAboveBaslineColumns}
                noItemsMessage={
                  <FormattedMessage
                    id="xpack.securitySolution.entityAnalytics.scoreSpikesCallout.noNewEntities"
                    defaultMessage="No new entities with spikes above baseline"
                  />
                }
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </FlyoutBody>
      </>
    );
  }
);

RiskScoreSpikeDetailsPanel.displayName = 'RiskScoreSpikeDetailsPanel';
