/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiMarkdownFormat, EuiSkeletonText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import moment from 'moment';
import React from 'react';
import { SloStateBadge, SloStatusBadge } from '../../../components/slo/slo_badges';
import { SloRemoteBadge } from '../../slos/components/badges/slo_remote_badge';
import { SLOGroupings } from './groupings/slo_groupings';

export interface Props {
  slo?: SLOWithSummaryResponse;
  isLoading: boolean;
}

export function HeaderTitle({ isLoading, slo }: Props) {
  if (isLoading || !slo) {
    return <EuiSkeletonText lines={2} data-test-subj="loadingTitle" />;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexGroup
        direction="row"
        gutterSize="s"
        alignItems="center"
        justifyContent="flexStart"
        responsive={false}
        wrap={true}
      >
        <SloStatusBadge slo={slo} />
        <SloStateBadge slo={slo} />
        <SloRemoteBadge slo={slo} />
        <EuiFlexGroup
          direction="row"
          gutterSize="m"
          alignItems="center"
          justifyContent="flexStart"
          responsive={false}
          wrap={true}
        >
          <EuiFlexItem grow={false}>
            <EuiMarkdownFormat textSize="xs" color="subdued">
              {i18n.translate('xpack.slo.sloDetails.headerTitle.lastUpdatedLabel', {
                defaultMessage: '**Last updated by** {updatedBy} **on** {updatedAt}',
                values: {
                  updatedBy: slo.updatedBy ?? NOT_AVAILABLE_LABEL,
                  updatedAt: moment(slo.updatedAt).format('ll'),
                },
              })}
            </EuiMarkdownFormat>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiMarkdownFormat textSize="xs" color="subdued">
              {i18n.translate('xpack.slo.sloDetails.headerTitle.createdLabel', {
                defaultMessage: '**Created by** {createdBy} **on** {createdAt}',
                values: {
                  createdBy: slo.createdBy ?? NOT_AVAILABLE_LABEL,
                  createdAt: moment(slo.createdAt).format('ll'),
                },
              })}
            </EuiMarkdownFormat>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
      <SLOGroupings slo={slo} />
    </EuiFlexGroup>
  );
}

const NOT_AVAILABLE_LABEL = i18n.translate('xpack.slo.sloDetails.headerTitle.notAvailableLabel', {
  defaultMessage: 'n/a',
});
