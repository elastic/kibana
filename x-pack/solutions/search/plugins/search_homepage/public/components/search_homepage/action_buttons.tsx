/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

export const ActionButtons = () => {
  return (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" wrap responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="search-homepage-upload-file-button"
              color="text"
              iconType="export"
            >
              {i18n.translate('xpack.searchHomepage.actions.uploadFile', {
                defaultMessage: 'Upload a file',
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="search-homepage-install-sample-data-button"
              color="text"
              iconType="package"
            >
              {i18n.translate('xpack.searchHomepage.actions.installSampleData', {
                defaultMessage: 'Install sample data',
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="search-homepage-open-discover-button"
              color="text"
              iconType="discoverApp"
            >
              {i18n.translate('xpack.searchHomepage.actions.openDiscover', {
                defaultMessage: 'Open Discover',
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="search-homepage-create-dashboard-button"
              color="text"
              iconType="dashboardApp"
            >
              {i18n.translate('xpack.searchHomepage.actions.createDashboard', {
                defaultMessage: 'Create a dashboard',
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="search-homepage-create-index-button"
              color="text"
              iconType="indexManagementApp"
            >
              {i18n.translate('xpack.searchHomepage.actions.createIndex', {
                defaultMessage: 'Create an index',
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="search-homepage-open-console-button"
              color="text"
              iconType="sessionViewer"
            >
              {i18n.translate('xpack.searchHomepage.actions.openConsole', {
                defaultMessage: 'Open Console',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          iconType="pencil"
          data-test-subj="search-homepage-edit-button"
          color="text"
          aria-label={i18n.translate('xpack.searchHomepage.actions.edit', {
            defaultMessage: 'Edit',
          })}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
