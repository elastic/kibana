/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiEmptyPrompt, EuiImage } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { dashboardsDark, dashboardsLight } from '@kbn/shared-svg';
import { useIsDarkMode } from '../../../../hooks/use_is_dark_mode';

interface Props {
  actions: React.ReactNode;
}

export function EmptyDashboards({ actions }: Props) {
  const isDarkMode = useIsDarkMode();

  return (
    <EuiEmptyPrompt
      hasShadow={false}
      hasBorder={false}
      icon={
        <EuiImage size="fullWidth" src={isDarkMode ? dashboardsDark : dashboardsLight} alt="" />
      }
      title={
        <h2>
          {i18n.translate('xpack.infra.assetDetails.dashboards.emptyTitle', {
            defaultMessage: 'Want your own view?',
          })}
        </h2>
      }
      layout="horizontal"
      color="plain"
      body={
        <>
          <ul>
            <li>
              {i18n.translate('xpack.infra.assetDetails.dashboards.emptyBody.first', {
                defaultMessage: 'Link your own dashboard to this view',
              })}
            </li>
            <li>
              {i18n.translate('xpack.infra.assetDetails.dashboards.emptyBody.second', {
                defaultMessage: 'Provide the best visualizations relevant to your business',
              })}
            </li>
            <li>
              {i18n.translate('xpack.infra.assetDetails.dashboards.emptyBody', {
                defaultMessage: 'Add or remove them at any time',
              })}
            </li>
          </ul>
          <p>
            {i18n.translate('xpack.infra.assetDetails.dashboards.emptyBody.getStarted', {
              defaultMessage: 'To get started, add your dashboard',
            })}
          </p>
        </>
      }
      actions={actions}
    />
  );
}
