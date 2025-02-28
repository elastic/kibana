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
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { TagsList } from '@kbn/observability-shared-plugin/public';

import { SloRemoteBadge } from '../../slos/components/badges/slo_remote_badge';
import { SLOGroupings } from './groupings/slo_groupings';
import moment from 'moment';
import { SloStatusPanel } from './slo_status_panel';
import { SloStatusPanelDisabled } from './slo_status_panel_disabled';

export interface Props {
  slo?: SLOWithSummaryResponse;
  isLoading: boolean;
}

export function HeaderTitle({ isLoading, slo }: Props) {
  if (isLoading || !slo) {
    return <EuiSkeletonText lines={2} data-test-subj="loadingTitle" />;
  }

  return (
    <EuiFlexGroup direction="row" gutterSize="m">
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexGroup
          direction="row"
          gutterSize="s"
          alignItems="center"
          justifyContent="flexStart"
          responsive={true}
          wrap={true}
        >
          {isLoading || slo.enabled ? (
            <SloStatusPanel isLoading={isLoading} slo={slo} />
          ) : (
            <SloStatusPanelDisabled />
          )}
          <EuiFlexItem>
            <EuiFlexItem grow={true}>
              <EuiText className={'eui-textBreakWord'}>
                <EuiMarkdownFormat textSize="xs" color="subdued">
                  {i18n.translate('xpack.slo.sloDetails.overview.description', {
                    defaultMessage: '**Description** {description}',
                    values: {
                      description: slo.description ? slo.description : '--',
                    },
                  })}
                </EuiMarkdownFormat>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSpacer size="s" />
            </EuiFlexItem>
            <EuiFlexGroup>
              <EuiFlexItem grow={true}>
                <EuiMarkdownFormat textSize="xs" color="subdued">
                  {i18n.translate('xpack.slo.sloDetails.headerTitle.lastUpdatedLabel', {
                    defaultMessage:
                      '**Last updated by** reallylongusername@longdomainname.org **on** {updatedAt}',
                    values: {
                      updatedBy: slo.updatedBy ?? NOT_AVAILABLE_LABEL,
                      updatedAt: moment(slo.updatedAt).format('ll'),
                    },
                  })}
                </EuiMarkdownFormat>
              </EuiFlexItem>
              <EuiFlexItem grow={true}>
                <EuiMarkdownFormat textSize="xs" color="subdued">
                  {i18n.translate('xpack.slo.sloDetails.headerTitle.createdLabel', {
                    defaultMessage:
                      '**Created by** reallylongusername@longdomainname.org **on** {createdAt}',
                    values: {
                      createdBy: slo.createdBy ?? NOT_AVAILABLE_LABEL,
                      createdAt: moment(slo.createdAt).format('ll'),
                    },
                  })}
                </EuiMarkdownFormat>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiSpacer size="s" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <TagsList tags={slo.tags} />
            </EuiFlexItem>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup direction="row" alignItems="center">
          <SloRemoteBadge slo={slo} />
          <SLOGroupings slo={slo} />
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}

const NOT_AVAILABLE_LABEL = i18n.translate('xpack.slo.sloDetails.headerTitle.notAvailableLabel', {
  defaultMessage: 'n/a',
});
