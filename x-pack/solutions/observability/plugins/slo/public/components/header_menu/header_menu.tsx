/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiHeaderLink, EuiHeaderLinks } from '@elastic/eui';
import { HeaderMenuPortal } from '@kbn/observability-shared-plugin/public';
import { useKibana } from '../../hooks/use_kibana';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { SLOS_BASE_PATH, SLO_SETTINGS_PATH } from '../../../common/locators/paths';

export function HeaderMenu(): React.ReactElement | null {
  const { http, theme, docLinks } = useKibana().services;

  const { appMountParameters, isServerless } = usePluginContext();
  return (
    <HeaderMenuPortal
      setHeaderActionMenu={appMountParameters?.setHeaderActionMenu!}
      theme$={theme.theme$}
    >
      <EuiFlexGroup responsive={false} gutterSize="s">
        <EuiFlexItem>
          <EuiHeaderLinks gutterSize="xs">
            <EuiHeaderLink
              color="primary"
              href={http.basePath.prepend('/app/observability/annotations')}
            >
              {i18n.translate('xpack.slo.home.annotations', {
                defaultMessage: 'Annotations',
              })}
            </EuiHeaderLink>
            <EuiHeaderLink color="primary" href={docLinks.links.observability.slo} target="_blank">
              {i18n.translate('xpack.slo.headerMenu.documentation', {
                defaultMessage: 'SLO documentation',
              })}
            </EuiHeaderLink>
            {!isServerless && (
              <EuiHeaderLink
                color="primary"
                href={http.basePath.prepend(`${SLOS_BASE_PATH}${SLO_SETTINGS_PATH}`)}
              >
                {i18n.translate('xpack.slo.headerMenu.settings', {
                  defaultMessage: 'Settings',
                })}
              </EuiHeaderLink>
            )}
            <EuiHeaderLink color="primary" href={http.basePath.prepend('/app/slos/management')}>
              {i18n.translate('xpack.slo.home.manage', {
                defaultMessage: 'Manage SLOs',
              })}
            </EuiHeaderLink>
          </EuiHeaderLinks>
        </EuiFlexItem>
      </EuiFlexGroup>
    </HeaderMenuPortal>
  );
}
