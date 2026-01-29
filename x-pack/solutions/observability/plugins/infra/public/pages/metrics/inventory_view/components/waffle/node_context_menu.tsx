/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCode, type WithEuiThemeProps, withEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import React, { useMemo, useState } from 'react';
import type { SectionLinkProps } from '@kbn/observability-shared-plugin/public';
import {
  Section,
  SectionTitle,
  SectionSubtitle,
  SectionLinks,
  SectionLink,
  ActionMenuDivider,
  useLinkProps,
} from '@kbn/observability-shared-plugin/public';
import {
  findInventoryModel,
  findInventoryFields,
  type InventoryItemType,
} from '@kbn/metrics-data-access-plugin/common';
import { useAssetDetailsRedirect } from '@kbn/metrics-data-access-plugin/public';
import {
  getLogsLocatorFromUrlService,
  getNodeQuery,
  getTimeRange,
} from '@kbn/logs-shared-plugin/common';
import { uptimeOverviewLocatorID } from '@kbn/observability-plugin/common';
import { useKibanaContextForPlugin } from '../../../../../hooks/use_kibana';
import { HOST_NAME_FIELD, HOST_HOSTNAME_FIELD } from '../../../../../../common/constants';
import { AlertFlyout } from '../../../../../alerting/inventory/components/alert_flyout';
import type {
  InfraWaffleMapNode,
  InfraWaffleMapOptions,
} from '../../../../../common/inventory/types';
import { getUptimeUrl } from '../../lib/get_uptime_url';
import { useWaffleOptionsContext } from '../../hooks/use_waffle_options';

interface Props {
  options: InfraWaffleMapOptions;
  currentTime: number;
  node: InfraWaffleMapNode;
  nodeType: InventoryItemType;
}
type PropsWithTheme = Props & WithEuiThemeProps;

export const NodeContextMenu = withEuiTheme(
  ({ options, currentTime, node, nodeType }: PropsWithTheme) => {
    const { getAssetDetailUrl } = useAssetDetailsRedirect();
    const [flyoutVisible, setFlyoutVisible] = useState(false);
    const { preferredSchema } = useWaffleOptionsContext();
    const inventoryModel = findInventoryModel(nodeType);
    const nodeDetailFrom = currentTime - inventoryModel.metrics.defaultTimeRangeInSeconds * 1000;
    const { services } = useKibanaContextForPlugin();
    const { application, share } = services;
    const logsLocator = getLogsLocatorFromUrlService(share.url)!;
    const uptimeLocator = share.url.locators.get(uptimeOverviewLocatorID);
    const uiCapabilities = application?.capabilities;

    const showDetail = inventoryModel.crosslinkSupport.details;
    const showLogsLink =
      inventoryModel.crosslinkSupport.logs && node.id && uiCapabilities?.logs?.show;
    const showAPMTraceLink =
      inventoryModel.crosslinkSupport.apm && uiCapabilities?.apm && uiCapabilities?.apm.show;
    const showUptimeLink =
      inventoryModel.crosslinkSupport.uptime &&
      (['pod', 'container'].includes(nodeType) || node.ip) &&
      !!uptimeLocator;
    const showCreateAlertLink = uiCapabilities?.infrastructure?.save;

    const inventoryId = useMemo(() => {
      if (nodeType === 'host') {
        if (node.ip) {
          return {
            label: (
              <EuiCode>
                {i18n.translate('xpack.infra.inventoryId.host.ipCodeLabel', {
                  defaultMessage: 'host.ip',
                })}
              </EuiCode>
            ),
            value: node.ip,
          };
        }
      } else {
        const { id } = findInventoryFields(nodeType);
        return {
          label: <EuiCode>{id}</EuiCode>,
          value: node.id,
        };
      }
      return { label: '', value: '' };
    }, [nodeType, node.ip, node.id]);

    const nodeDetailMenuItemLinkProps = getAssetDetailUrl({
      entityType: nodeType,
      entityId: node.id,
      search: {
        from: nodeDetailFrom,
        to: currentTime,
        name: node.name,
      },
    });

    const apmTracesMenuItemLinkProps = useLinkProps({
      app: 'apm',
      hash: 'traces',
      search: {
        kuery:
          nodeType === 'host'
            ? `${HOST_NAME_FIELD}:"${node.id}" OR ${HOST_HOSTNAME_FIELD}:"${node.id}"`
            : `${inventoryModel.fields.id}:"${node.id}"`,
      },
    });

    const uptimeMenuItemLinkUrl = showUptimeLink
      ? getUptimeUrl({ uptimeLocator, nodeType, node })
      : '';

    const nodeLogsMenuItem: SectionLinkProps = {
      label: i18n.translate('xpack.infra.nodeContextMenu.viewLogsName', {
        defaultMessage: '{inventoryName} logs',
        values: { inventoryName: inventoryModel.singularDisplayName },
      }),
      href: logsLocator.getRedirectUrl({
        query: getNodeQuery({
          nodeField: findInventoryFields(nodeType).id,
          nodeId: node.id,
        }),
        timeRange: getTimeRange(currentTime),
      }),
      'data-test-subj': 'viewLogsContextMenuItem',
    };

    const nodeDetailMenuItem: SectionLinkProps = {
      label: i18n.translate('xpack.infra.nodeContextMenu.viewMetricsName', {
        defaultMessage: '{inventoryName} metrics',
        values: { inventoryName: inventoryModel.singularDisplayName },
      }),
      href: nodeDetailMenuItemLinkProps.href,
    };

    const apmTracesMenuItem: SectionLinkProps = {
      label: i18n.translate('xpack.infra.nodeContextMenu.viewAPMTraces', {
        defaultMessage: '{inventoryName} APM traces',
        values: { inventoryName: inventoryModel.singularDisplayName },
      }),
      ...apmTracesMenuItemLinkProps,
      'data-test-subj': 'viewApmTracesContextMenuItem',
    };

    const uptimeMenuItem: SectionLinkProps = {
      label: i18n.translate('xpack.infra.nodeContextMenu.viewUptimeLink', {
        defaultMessage: '{inventoryName} in Uptime',
        values: { inventoryName: inventoryModel.singularDisplayName },
      }),
      href: uptimeMenuItemLinkUrl,
    };

    const createAlertMenuItem: SectionLinkProps = {
      label: i18n.translate('xpack.infra.nodeContextMenu.createRuleLink', {
        defaultMessage: 'Create inventory rule',
      }),
      onClick: () => {
        setFlyoutVisible(true);
      },
    };

    return (
      <>
        <div style={{ maxWidth: 300 }} data-test-subj="nodeContextMenu">
          <Section>
            <SectionTitle>
              <FormattedMessage
                id="xpack.infra.nodeContextMenu.title"
                defaultMessage="{inventoryName} details"
                values={{ inventoryName: inventoryModel.singularDisplayName }}
              />
            </SectionTitle>
            {inventoryId.label && (
              <SectionSubtitle>
                <div style={{ wordBreak: 'break-all' }}>
                  <FormattedMessage
                    id="xpack.infra.nodeContextMenu.description"
                    defaultMessage="View details for {label} {value}"
                    values={{ label: inventoryId.label, value: inventoryId.value }}
                  />
                </div>
              </SectionSubtitle>
            )}
            <SectionLinks>
              {showLogsLink && (
                <SectionLink data-test-subj="viewLogsContextMenuItem" {...nodeLogsMenuItem} />
              )}
              {showDetail && (
                <SectionLink
                  data-test-subj="viewAssetDetailsContextMenuItem"
                  {...nodeDetailMenuItem}
                />
              )}
              {showAPMTraceLink && (
                <SectionLink data-test-subj="viewApmTracesContextMenuItem" {...apmTracesMenuItem} />
              )}
              {showUptimeLink && (
                <SectionLink
                  data-test-subj="viewApmUptimeContextMenuItem"
                  {...uptimeMenuItem}
                  color={'primary'}
                />
              )}
            </SectionLinks>
            <ActionMenuDivider />
            {showCreateAlertLink && (
              <SectionLinks>
                <SectionLink iconType={'bell'} color={'primary'} {...createAlertMenuItem} />
              </SectionLinks>
            )}
          </Section>
        </div>

        {flyoutVisible && (
          <AlertFlyout
            filter={`${findInventoryFields(nodeType).id}: "${node.id}"`}
            options={options}
            nodeType={nodeType}
            setVisible={setFlyoutVisible}
            visible={flyoutVisible}
            schema={preferredSchema}
          />
        )}
      </>
    );
  }
);
