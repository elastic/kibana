/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';

import { css } from '@emotion/react';
import dedent from 'dedent';

import { useValues } from 'kea';

import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  useGeneratedHtmlId,
  useEuiTheme,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { NATIVE_CONNECTOR_DEFINITIONS, NativeConnector } from '@kbn/search-connectors';
import { TryInConsoleButton } from '@kbn/try-in-console';

import { KibanaDeps } from '../../../../../../../common/types';
import { NewConnectorLogic } from '../../../new_index/method_connector/new_connector_logic';
import { SelfManagePreference } from '../create_connector';

import { ManualConfigurationFlyout } from './manual_configuration_flyout';

export interface ManualConfigurationProps {
  isDisabled: boolean;
  selfManagePreference: SelfManagePreference;
}

interface ConnectorConfiguration {
  [key: string]: {
    value: string;
  };
}

export const ManualConfiguration: React.FC<ManualConfigurationProps> = ({
  isDisabled,
  selfManagePreference,
}) => {
  const { euiTheme } = useEuiTheme();
  const { services } = useKibana<KibanaDeps>();
  const [isPopoverOpen, setPopover] = useState(false);
  const splitButtonPopoverId = useGeneratedHtmlId({
    prefix: 'splitButtonPopover',
  });
  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };
  const { selectedConnector, rawName } = useValues(NewConnectorLogic);
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const [flyoutContent, setFlyoutContent] = useState<'manual_config' | 'client'>();
  const getCodeSnippet = (): string => {
    const connectorInfo: NativeConnector | undefined = selectedConnector?.serviceType
      ? NATIVE_CONNECTOR_DEFINITIONS[selectedConnector.serviceType]
      : undefined;
    if (!connectorInfo) {
      return '';
    }

    const dynamicConfigValues = Object.entries(
      connectorInfo.configuration as ConnectorConfiguration
    )
      .map(([key, config]) => {
        const defaultValue = config ? JSON.stringify(config.value) : null;
        return `    "${key}": ${defaultValue}`;
      })
      .join(',\n');
    const CONSOLE_SNIPPET = dedent` # Example of how to create a ${connectorInfo?.name} connector using the API
# This also creates related resources like an index and an API key.
# This is an alternative to using the UI creation flow.

# 1. Create an index
PUT connector-${rawName}
{
  "settings": {
    "index": {
      "number_of_shards": 3,
      "number_of_replicas": 2
    }
  }
}  
# 2. Create a connector
PUT _connector/${rawName}
{
  "name": "My ${connectorInfo?.name} connector",
  "index_name":  "connector-${rawName}",
  "service_type": "${selectedConnector?.serviceType}"
}
# 3. Create an API key
POST /_security/api_key
{
  "name": "${rawName}-api-key",
  "role_descriptors": {
    "${selectedConnector?.serviceType}-api-key-role": {
      "cluster": [
        "monitor",
        "manage_connector"
      ],
      "indices": [
        {
          "names": [
            "connector-${rawName}",
            ".search-acl-filter-connector-${rawName}",
            ".elastic-connectors*"
          ],
          "privileges": [
            "all"
          ],
          "allow_restricted_indices": false
        }
      ]
    }
  }
}

# 🔧 Configure your connector
# NOTE: Configuration keys differ per service type.
PUT _connector/${rawName}/_configuration
{
  "values": {
${dynamicConfigValues}
  }
}

# 🔌 Verify your connector is connected
GET _connector/${rawName}

# 🔄 Sync data
POST _connector/_sync_job
{
  "id": "${rawName}",
  "job_type": "full"
}

# ⏳ Check sync status
GET _connector/_sync_job?connector_id=${rawName}&size=1

# Once the job completes, the status should return completed
# 🎉 Verify that data is present in the index with the following API call 
GET connector-${rawName}/_count

# 🔎 Elasticsearch stores data in documents, which are JSON objects. List the individual documents with the following API call
GET connector-${rawName}/_search
`;
    return CONSOLE_SNIPPET;
  };

  const items = [
    <EuiContextMenuItem
      key="copy"
      icon="wrench"
      onClick={() => {
        setFlyoutContent('manual_config');
        setIsFlyoutVisible(true);
      }}
    >
      {i18n.translate(
        'xpack.enterpriseSearch.createConnector.finishUpStep.manageAttachedIndexContextMenuItemLabel',
        { defaultMessage: 'Manual configuration' }
      )}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="edit"
      icon="console"
      onClick={() => {
        closePopover();
      }}
      css={css`
        .euiLink {
          color: ${euiTheme.colors.text};
          font-weight: ${euiTheme.font.weight.regular};
        }
      `}
    >
      <TryInConsoleButton
        application={services.application}
        sharePlugin={services.share}
        consolePlugin={services.console}
        content={i18n.translate(
          'xpack.enterpriseSearch.createConnector.flyoutManualConfigContent.TryInConsoleLabel',
          {
            defaultMessage: 'Run in Console',
          }
        )}
        type="link"
        request={getCodeSnippet()}
      />
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="share"
      icon="console"
      onClick={() => {
        setFlyoutContent('client');
        setIsFlyoutVisible(true);
      }}
    >
      {i18n.translate(
        'xpack.enterpriseSearch.createConnector.finishUpStep.scheduleASyncContextMenuItemLabel',
        {
          defaultMessage: 'Try with CLI',
        }
      )}
    </EuiContextMenuItem>,
  ];

  return (
    <>
      <EuiPopover
        id={splitButtonPopoverId}
        button={
          <EuiButtonIcon
            data-test-subj="enterpriseSearchFinishUpStepButton"
            display="fill"
            disabled={isDisabled}
            size="m"
            iconType="boxesVertical"
            aria-label={i18n.translate(
              'xpack.enterpriseSearch.createConnector.finishUpStep.euiButtonIcon.moreLabel',
              { defaultMessage: 'More' }
            )}
            onClick={onButtonClick}
          />
        }
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel items={items} />
      </EuiPopover>
      {isFlyoutVisible && (
        <ManualConfigurationFlyout
          setIsFlyoutVisible={setIsFlyoutVisible}
          flyoutContent={flyoutContent}
          selfManagePreference={selfManagePreference}
        />
      )}
    </>
  );
};
