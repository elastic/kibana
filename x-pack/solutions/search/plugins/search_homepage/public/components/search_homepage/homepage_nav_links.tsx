/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFlexGroup,
  EuiTitle,
  EuiFlexItem,
  EuiIcon,
  EuiButtonEmpty,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { homepageNavLinkHeaderIconStyle, homepageNavLinkHeaderStyle } from './styles';
import { useKibana } from '../../hooks/use_kibana';

const getNavLinkHeader = (type: 'stackManagement' | 'dataManagement') => {
  return type === 'stackManagement' ? (
    <FormattedMessage
      id="xpack.searchHomepage.homepageNavLinks.stackManagementTitle"
      defaultMessage="Stack Management"
    />
  ) : (
    <FormattedMessage
      id="xpack.searchHomepage.homepageNavLinks.dataManagementTitle"
      defaultMessage="Data Management"
    />
  );
};

export const HomepageNavLinks = ({ type }: { type: 'dataManagement' | 'stackManagement' }) => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { application, chrome },
  } = useKibana();

  const DATA_NAV_LINK_CARDS = {
    dataManagement: [
      {
        title: (
          <FormattedMessage
            id="xpack.searchHomepage.homepageNavLinks.indexManagementTitle"
            defaultMessage="Index Management"
          />
        ),
        description: (
          <FormattedMessage
            id="xpack.searchHomepage.homepageNavLinks.indexManagementDescription"
            defaultMessage="Update your Elasticsearch indices individually or in bulk."
          />
        ),
        onClick: () => {
          const url = chrome.navLinks.get('management:index_management')?.url;
          if (url) {
            application.navigateToUrl(url);
          }
        },
      },
      {
        title: (
          <FormattedMessage
            id="xpack.searchHomepage.homepageNavLinks.ingestPipelinesTitle"
            defaultMessage="Ingest pipelines"
          />
        ),
        description: (
          <FormattedMessage
            id="xpack.searchHomepage.homepageNavLinks.ingestPipelinesDescription"
            defaultMessage="Enrich your data before indexin into Elasticsearch."
          />
        ),
        onClick: () => {},
      },
      {
        title: (
          <FormattedMessage
            id="xpack.searchHomepage.homepageNavLinks.backupAndRestoreTitle"
            defaultMessage="Backup and restore"
          />
        ),
        description: (
          <FormattedMessage
            id="xpack.searchHomepage.homepageNavLinks.backupAndRestoreDescription"
            defaultMessage="Save and restore snapshots to recover cluster states."
          />
        ),
        onClick: () => {},
      },
      {
        title: (
          <FormattedMessage
            id="xpack.searchHomepage.homepageNavLinks.manageIndexLifecyclesTitle"
            defaultMessage="Manage index lifecycles"
          />
        ),
        description: (
          <FormattedMessage
            id="xpack.searchHomepage.homepageNavLinks.manageIndexLifecyclesDescription"
            defaultMessage="Automatically perform operations as an index ages."
          />
        ),
        onClick: () => {},
      },
    ],
    stackManagement: [
      {
        title: (
          <FormattedMessage
            id="xpack.searchHomepage.homepageNavLinks.monitorTheStackTitle"
            defaultMessage="Monitor the stack"
          />
        ),
        description: (
          <FormattedMessage
            id="xpack.searchHomepage.homepageNavLinks.monitorTheStackDescription"
            defaultMessage="Track the health of your deployment."
          />
        ),
        onClick: () => {},
      },
      {
        title: (
          <FormattedMessage
            id="xpack.searchHomepage.homepageNavLinks.managePermissions"
            defaultMessage="Manage permissions"
          />
        ),
        description: (
          <FormattedMessage
            id="xpack.searchHomepage.homepageNavLinks.managePermissionsDescription"
            defaultMessage="Control who has access and what tasks they can perform."
          />
        ),
        onClick: () => {},
      },
      {
        title: (
          <FormattedMessage
            id="xpack.searchHomepage.homepageNavLinks.rulesAndAlertsTitle"
            defaultMessage="Rules and Alerts"
          />
        ),
        description: (
          <FormattedMessage
            id="xpack.searchHomepage.homepageNavLinks.rulesAndAlertsDescription"
            defaultMessage="Receive alerts when a condition is met."
          />
        ),
        onClick: () => {},
      },
      {
        title: (
          <FormattedMessage
            id="xpack.searchHomepage.homepageNavLinks.inferenceEndpointsTitle"
            defaultMessage="Inference Endpoints"
          />
        ),
        description: (
          <FormattedMessage
            id="xpack.searchHomepage.homepageNavLinks.inferenceEndpointsDescription"
            defaultMessage="Straemline the deployment and management of models."
          />
        ),
        onClick: () => {},
      },
    ],
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              alignItems="center"
              responsive={false}
              gutterSize="s"
              css={homepageNavLinkHeaderStyle(euiTheme)}
            >
              <EuiFlexItem grow={false} css={homepageNavLinkHeaderIconStyle(euiTheme)}>
                <EuiIcon type="database" size="m" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h4>{getNavLinkHeader(type)}</h4>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="searchHomepageHomepageNavLinksCustomizeButton"
              iconSide="left"
              iconType="pencil"
              color="text"
            >
              <FormattedMessage
                id="xpack.searchHomepage.homepageNavLinks.manageDataButtonLabel"
                defaultMessage="Customize"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="row" gutterSize="l">
          {DATA_NAV_LINK_CARDS[type].map((card, index) => (
            <EuiFlexItem key={index}>
              <EuiPanel hasBorder onClick={card.onClick}>
                <EuiFlexGroup direction="column" gutterSize="s">
                  <EuiFlexItem>
                    <EuiTitle size="s">
                      <h4>{card.title}</h4>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s" color="subdued">
                      <p>{card.description}</p>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
