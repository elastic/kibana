/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Routes } from '@kbn/shared-ux-router';
import { Redirect, useHistory, useLocation } from 'react-router-dom';
import { EuiCallOut, EuiPageTemplate } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { AppsPage } from './apps/apps_page';
import { EnvironmentsPage } from './environments/environments_page';
import { FlagEditorPage } from './flags/flag_editor_page';
import { FlagsPage } from './flags/flags_page';
import { paths } from './paths';
import { useAppServices } from './app_services';

export const FeatureFlagsApp = () => {
  const history = useHistory();
  const location = useLocation();
  const { canSave } = useAppServices();
  const pathname = location.pathname;

  const tabs = [
    {
      label: i18n.translate('xpack.featureFlagsManagement.app.flagsTabLabel', {
        defaultMessage: 'Flags',
      }),
      isSelected: pathname.startsWith(paths.flags),
      onClick: () => history.push(paths.flags),
      'data-test-subj': 'featureFlagsFlagsTab',
    },
    {
      label: i18n.translate('xpack.featureFlagsManagement.app.appsTabLabel', {
        defaultMessage: 'Apps',
      }),
      isSelected: pathname.startsWith(paths.apps),
      onClick: () => history.push(paths.apps),
      'data-test-subj': 'featureFlagsAppsTab',
    },
    {
      label: i18n.translate('xpack.featureFlagsManagement.app.environmentsTabLabel', {
        defaultMessage: 'Environments',
      }),
      isSelected: pathname.startsWith(paths.environments),
      onClick: () => history.push(paths.environments),
      'data-test-subj': 'featureFlagsEnvironmentsTab',
    },
  ];

  return (
    <EuiPageTemplate
      data-test-subj="featureFlagsManagementApp"
      restrictWidth={false}
      grow
      offset={0}
    >
      <EuiPageTemplate.Header
        pageTitle={
          <FormattedMessage
            id="xpack.featureFlagsManagement.app.pageTitle"
            defaultMessage="Feature flags"
          />
        }
        description={
          <FormattedMessage
            id="xpack.featureFlagsManagement.app.pageDescription"
            defaultMessage="Manage flags, the apps that evaluate them, and the environments they target."
          />
        }
        tabs={tabs}
      />
      {!canSave && (
        <EuiPageTemplate.Section grow={false} paddingSize="l">
          <EuiCallOut
            announceOnMount
            color="primary"
            iconType="iInCircle"
            title={
              <FormattedMessage
                id="xpack.featureFlagsManagement.app.readOnlyTitle"
                defaultMessage="You have read-only access"
              />
            }
          >
            <FormattedMessage
              id="xpack.featureFlagsManagement.app.readOnlyDescription"
              defaultMessage="You can view flags, apps and environments. Saving changes requires the feature flags save privilege."
            />
          </EuiCallOut>
        </EuiPageTemplate.Section>
      )}
      <Routes>
        <Route exact path={paths.flags} component={FlagsPage} />
        <Route exact path="/flags/:flagKey" component={FlagEditorPage} />
        <Route exact path={paths.apps} component={AppsPage} />
        <Route exact path="/apps/:appKey" component={AppsPage} />
        <Route exact path={paths.environments} component={EnvironmentsPage} />
        <Redirect to={paths.flags} />
      </Routes>
    </EuiPageTemplate>
  );
};
