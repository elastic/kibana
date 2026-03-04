/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { EuiFlexGroup, EuiFlexItem, EuiHeaderLink, EuiHeaderLinks } from '@elastic/eui';
// import { i18n } from '@kbn/i18n';
// import { HeaderMenuPortal } from '@kbn/observability-shared-plugin/public';
import React, { useEffect } from 'react';
// import { paths } from '@kbn/slo-shared-plugin/common/locators/paths';
// import { useKibana } from '../../hooks/use_kibana';
import { usePluginContext } from '../../hooks/use_plugin_context';
// import { FeedbackButton } from '../../pages/slos/components/common/feedback_button';

/**
 * App menu (optional band below global header) is set to undefined so it is no longer visible.
 * The former items (Give feedback, Annotations, SLO documentation, Settings, Manage SLOs)
 * are now available in the global header overflow menu and primary actions.
 */
export function HeaderMenu(): null {
  const { appMountParameters } = usePluginContext();

  useEffect(() => {
    appMountParameters?.setHeaderActionMenu?.(undefined);
  }, [appMountParameters]);

  return null;

  // Commented out: previous app menu items (now in global header overflow + New button)
  // const { http, theme, docLinks } = useKibana().services;
  // return (
  //   <HeaderMenuPortal
  //     setHeaderActionMenu={appMountParameters?.setHeaderActionMenu!}
  //     theme$={theme.theme$}
  //   >
  //     <EuiFlexGroup responsive={false} gutterSize="s">
  //       <EuiFlexItem>
  //         <EuiHeaderLinks gutterSize="xs">
  //           <FeedbackButton />
  //           <EuiHeaderLink
  //             color="primary"
  //             href={http.basePath.prepend('/app/observability/annotations')}
  //           >
  //             {i18n.translate('xpack.slo.home.annotations', {
  //               defaultMessage: 'Annotations',
  //             })}
  //           </EuiHeaderLink>
  //           <EuiHeaderLink color="primary" href={docLinks.links.observability.slo} target="_blank">
  //             {i18n.translate('xpack.slo.headerMenu.documentation', {
  //               defaultMessage: 'SLO documentation',
  //             })}
  //           </EuiHeaderLink>
  //           <EuiHeaderLink color="primary" href={http.basePath.prepend(paths.slosSettings)}>
  //             {i18n.translate('xpack.slo.headerMenu.settings', {
  //               defaultMessage: 'Settings',
  //             })}
  //           </EuiHeaderLink>
  //           <EuiHeaderLink color="primary" href={http.basePath.prepend(paths.slosManagement)}>
  //             {i18n.translate('xpack.slo.home.manage', {
  //               defaultMessage: 'Manage SLOs',
  //             })}
  //           </EuiHeaderLink>
  //         </EuiHeaderLinks>
  //       </EuiFlexItem>
  //     </EuiFlexGroup>
  //   </HeaderMenuPortal>
  // );
}
