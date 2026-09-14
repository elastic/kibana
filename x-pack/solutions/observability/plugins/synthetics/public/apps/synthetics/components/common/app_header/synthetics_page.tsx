/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AppHeader,
  type AppHeaderBack,
  type AppHeaderDescription,
  type AppHeaderTab,
} from '@kbn/app-header';
import { EuiFlexGroup, EuiFlexItem, EuiPageSection, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  useSyntheticsAppHeaderMenu,
  type SyntheticsAppHeaderMenuOptions,
} from './use_synthetics_app_header_menu';

export const MONITORS_TITLE = i18n.translate('xpack.synthetics.monitors.pageHeader.title', {
  defaultMessage: 'Monitors',
});

export const CREATE_MONITOR_TITLE = i18n.translate(
  'xpack.synthetics.createMonitor.pageHeader.title',
  {
    defaultMessage: 'Create Monitor',
  }
);

export const EDIT_MONITOR_TITLE = i18n.translate('xpack.synthetics.editMonitor.pageHeader.title', {
  defaultMessage: 'Edit Monitor',
});

export const TEST_RUN_TITLE = i18n.translate('xpack.synthetics.testRunDetailsRoute.page.title', {
  defaultMessage: 'Test run details',
});

export const ERROR_DETAILS_TITLE = i18n.translate(
  'xpack.synthetics.editMonitor.errorDetailsRoute.title',
  {
    defaultMessage: 'Error details',
  }
);

export function SyntheticsPage({
  title,
  tabs,
  back,
  toolbar,
  menu,
  description,
  paddingSize = 'l',
  children,
}: {
  title: string;
  tabs?: AppHeaderTab[];
  back?: AppHeaderBack;
  toolbar?: React.ReactNode;
  menu?: SyntheticsAppHeaderMenuOptions;
  description?: AppHeaderDescription;
  paddingSize?: 'none' | 's' | 'm' | 'l';
  children: React.ReactNode;
}): React.ReactElement {
  const { menu: headerMenu, flyouts } = useSyntheticsAppHeaderMenu(menu);

  const body = (
    <>
      {toolbar}
      {toolbar ? <EuiSpacer size="m" /> : null}
      {children}
    </>
  );

  return (
    <>
      <AppHeader
        title={title}
        tabs={tabs}
        back={back}
        menu={headerMenu}
        description={description}
        spacing="standard"
      />
      <EuiSpacer size="l" />
      {flyouts}
      {paddingSize === 'none' ? (
        body
      ) : (
        <EuiPageSection paddingSize={paddingSize} contentProps={{ style: { paddingTop: 0 } }}>
          {body}
        </EuiPageSection>
      )}
    </>
  );
}

export function SyntheticsHeaderToolbar({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <EuiFlexGroup
      justifyContent="flexEnd"
      alignItems="center"
      gutterSize="s"
      wrap
      responsive={false}
    >
      {React.Children.map(children, (child, index) =>
        child == null ? null : (
          <EuiFlexItem key={index} grow={false}>
            {child}
          </EuiFlexItem>
        )
      )}
    </EuiFlexGroup>
  );
}
