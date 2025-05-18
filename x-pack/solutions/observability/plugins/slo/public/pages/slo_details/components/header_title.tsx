/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownFormat,
  EuiSkeletonText,
  EuiText,
} from '@elastic/eui';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { TagsList } from '@kbn/observability-shared-plugin/public';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { SloStateBadge, SloStatusBadge, SloValueBadge } from '../../../components/slo/slo_badges';
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
        <SloValueBadge slo={slo} isLoading={isLoading} />
        <SloStatusBadge slo={slo} isLoading={isLoading} />
        <SloStateBadge slo={slo} />
        <SloRemoteBadge slo={slo} />
        {!!slo?.tags?.length && (
          <EuiFlexItem grow={true}>
            <TagsList tags={slo.tags} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {slo.description && (
        <EuiFlexItem grow={true}>
          <EuiText className={'eui-textBreakWord'}>
            <EuiMarkdownFormat textSize="xs" color="subdued">
              {slo.description}
            </EuiMarkdownFormat>
          </EuiText>
        </EuiFlexItem>
      )}
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
      <SLOGroupings slo={slo} />
    </EuiFlexGroup>
  );
}

const NOT_AVAILABLE_LABEL = i18n.translate('xpack.slo.sloDetails.headerTitle.notAvailableLabel', {
  defaultMessage: 'n/a',
});
