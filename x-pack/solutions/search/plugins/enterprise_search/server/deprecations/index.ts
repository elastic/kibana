/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CloudSetup } from '@kbn/cloud-plugin/server';
import { DeprecationsDetails } from '@kbn/core-deprecations-common';
import { GetDeprecationsContext, RegisterDeprecationsConfig } from '@kbn/core-deprecations-server';

import { i18n } from '@kbn/i18n';
import { Connector, fetchConnectors } from '@kbn/search-connectors';

import { ConfigType } from '..';

export const getRegisteredDeprecations = (
  config: ConfigType,
  cloud: CloudSetup,
  docsUrl: string
): RegisterDeprecationsConfig => {
  return {
    getDeprecations: async (ctx: GetDeprecationsContext) => {
      const entSearchDetails = getEnterpriseSearchNodeDeprecation(config, cloud, docsUrl);
      const [crawlerDetails, nativeConnectorsDetails] = await Promise.all([
        getCrawlerDeprecations(ctx, docsUrl),
        getNativeConnectorDeprecations(ctx, docsUrl),
      ]);
      return [...entSearchDetails, ...crawlerDetails, ...nativeConnectorsDetails];
    },
  };
};

/**
 * If Enterprise Search Node is configured, it's marked as a critical deprecation
 * Warns that removing the node will disable crawlers/connectors
 */
export function getEnterpriseSearchNodeDeprecation(
  config: ConfigType,
  cloud: CloudSetup,
  docsUrl: string
): DeprecationsDetails[] {
  if (config.host || config.customHeaders) {
    const steps = [];
    let addendum: string = '';
    const isCloud = !!cloud?.cloudId;
    if (isCloud) {
      steps.push(
        ...[
          i18n.translate('xpack.enterpriseSearch.deprecations.entsearchhost.gotocloud', {
            values: { baseUrl: cloud.baseUrl },
            defaultMessage:
              'Go to {baseUrl} and select this deployment. Or click the link above to go straight there.',
          }),
          i18n.translate('xpack.enterpriseSearch.deprecations.entsearchhost.clickedit', {
            defaultMessage: "Click the 'Edit' tab",
          }),
          i18n.translate('xpack.enterpriseSearch.deprecations.entsearchhost.scrolldown', {
            defaultMessage: "Scroll down to the 'Enterprise Search' section",
          }),
          i18n.translate('xpack.enterpriseSearch.deprecations.entsearchhost.clickx', {
            defaultMessage: "Click the red 'X' by 'Enterprise Search instances'",
          }),
          i18n.translate('xpack.enterpriseSearch.deprecations.entsearchhost.nocapacity', {
            defaultMessage: 'You should no longer see any Enterprise Search capacity',
          }),
          i18n.translate('xpack.enterpriseSearch.deprecations.entsearchhost.clicksave', {
            defaultMessage: "Click 'Save' and confirm",
          }),
        ]
      );
      addendum = `\n\n[${i18n.translate(
        'xpack.enterpriseSearch.deprecations.entsearchhost.manage',
        {
          defaultMessage: 'Click here to manage your deployment',
        }
      )}](${cloud.baseUrl + '/deployments/' + cloud.deploymentId}).`;
    } else {
      steps.push(
        ...[
          i18n.translate('xpack.enterpriseSearch.deprecations.entsearchhost.stopent', {
            defaultMessage: 'Stop all your Enterprise Search nodes',
          }),
          i18n.translate('xpack.enterpriseSearch.deprecations.entsearchhost.stopkibana', {
            defaultMessage: 'Stop all your Kibana nodes',
          }),
          i18n.translate('xpack.enterpriseSearch.deprecations.entsearchhost.removeconfig', {
            defaultMessage: "Edit 'kibana.yml' to remove 'enterpriseSearch.host'",
          }),
          i18n.translate('xpack.enterpriseSearch.deprecations.entsearchhost.removecustomconfig', {
            defaultMessage:
              "Edit 'kibana.yml' to remove 'enterpriseSearch.customHeaders' if it exists",
          }),
          i18n.translate('xpack.enterpriseSearch.deprecations.entsearchhost.restart', {
            defaultMessage: 'Restart Kibana',
          }),
        ]
      );
    }
    return [
      {
        level: 'critical',
        deprecationType: 'feature',
        title: i18n.translate('xpack.enterpriseSearch.deprecations.entsearchhost.title', {
          defaultMessage: 'Enterprise Search host(s) and configuration must be removed',
        }),
        message: {
          type: 'markdown',
          content: i18n.translate('xpack.enterpriseSearch.deprecations.entsearchhost.message', {
            values: {
              addendum,
              migration_link: docsUrl,
            },
            defaultMessage:
              'Enterprise Search is not supported in versions >= 9.x.\n\n' +
              'Please note the following:\n' +
              '- You must remove any Enterprise Search nodes from your deployment to proceed with the upgrade.\n' +
              '- You must also remove any Enterprise Search configuration elements in your Kibana config.\n' +
              '- If you are currently using App Search, Workplace Search, or the Elastic Web Crawler, these features will ' +
              'cease to function if you remove Enterprise Search from your deployment. Therefore, it is critical to ' +
              'first [migrate your Enterprise Search use cases]({migration_link}) before decommissioning your ' +
              'Enterprise Search instances.\n' +
              '- Scheduled syncs for Elastic-managed connectors will automatically resume after the 9.x upgrade completes.\n\n' +
              'For full details, see the documentation.{addendum}',
          }),
        },
        documentationUrl: docsUrl,
        correctiveActions: {
          manualSteps: steps,
        },
      },
    ];
  } else {
    return [];
  }
}

/**
 * if the customer was using Elastic Web Crawler, they must delete the connector records
 */
export async function getCrawlerDeprecations(
  ctx: GetDeprecationsContext,
  docsUrl: string
): Promise<DeprecationsDetails[]> {
  const client = ctx.esClient.asInternalUser;
  const crawlers: Connector[] = await fetchConnectors(client, undefined, true, undefined);
  if (crawlers.length === 0) {
    return []; // no deprecations to register if there are no Elastic Web Crawlers in the connectors index
  } else {
    return [
      {
        level: 'critical',
        deprecationType: 'feature',
        title: i18n.translate('xpack.enterpriseSearch.deprecations.crawler.title', {
          defaultMessage:
            'Elastic Web Crawler metadata records in the `.elastic-connectors` index must be removed.',
        }),
        message: {
          type: 'markdown',
          content: i18n.translate('xpack.enterpriseSearch.deprecations.crawler.message', {
            defaultMessage:
              'Enterprise Search, including Elastic Web Crawler, is not supported in versions >= 9.x.\n\n' +
              'In order to upgrade Native Connectors, metadata records in the `.elastic-connectors` index specific to ' +
              'Elastic Web Crawler must be removed.\n\n' +
              'Be sure to run the separate Crawler Migration Notebook first, if you intend to move these Crawler' +
              'configuration to the Open Crawler in 9.x.\n\n' +
              'For full details, see the documentation. ',
          }),
        },
        documentationUrl: docsUrl,
        correctiveActions: {
          manualSteps: [
            i18n.translate('xpack.enterpriseSearch.deprecations.crawler.listConnectors', {
              defaultMessage: 'Enumerate all connector records',
            }),
            i18n.translate('xpack.enterpriseSearch.deprecations.crawler.deleteCrawlers', {
              defaultMessage: 'Delete any that have `service_type: elastic-crawler`',
            }),
          ],
          api: {
            method: 'POST',
            path: '/internal/enterprise_search/deprecations/delete_crawler_connectors',
            body: {
              ids: crawlers.map((it) => it.id),
            },
          },
        },
      },
    ];
  }
}

/**
 * If the customer is using Native Connectors, they are told that they must convert their connectors to Connector Clients
 */
export async function getNativeConnectorDeprecations(
  ctx: GetDeprecationsContext,
  docsUrl: string
): Promise<DeprecationsDetails[]> {
  const client = ctx.esClient.asInternalUser;
  const connectors: Connector[] = await fetchConnectors(client, undefined, false, undefined);
  const nativeConnectors = connectors.filter((hit) => hit.is_native);
  if (nativeConnectors.length === 0) {
    return []; // no deprecations to register if there are no Native Connectors
  } else {
    const deprecations: DeprecationsDetails[] = [];

    if (nativeConnectors.length > 0) {
      // There are some native connectors
      deprecations.push({
        level: 'critical',
        deprecationType: 'feature',
        title: i18n.translate('xpack.enterpriseSearch.deprecations.fauxNativeConnector.title', {
          defaultMessage: 'Elastic-managed connectors are no longer supported',
        }),
        message: {
          type: 'markdown',
          content: i18n.translate(
            'xpack.enterpriseSearch.deprecations.fauxNativeConnector.message',
            {
              values: {
                connectorIds: nativeConnectors
                  .map((connector) => `- \`${connector.id}\``)
                  .join('\n'),
              },
              defaultMessage:
                'Elastic-managed connectors are no longer supported.\n\n' +
                'The following connectors need to be converted to self-managed connectors to continue using them:\n' +
                '{connectorIds}\n\n' +
                'This conversion is a lossless process and can be performed using "quick resolve".\n\n' +
                'Alternatively, deleting these connectors will also unblock your upgrade.',
            }
          ),
        },
        documentationUrl: docsUrl,
        correctiveActions: {
          manualSteps: [
            i18n.translate(
              'xpack.enterpriseSearch.deprecations.fauxNativeConnector.listConnectors',
              {
                defaultMessage: 'Identify all Elastic-managed connectors in the Connectors UI.',
              }
            ),
            i18n.translate(
              'xpack.enterpriseSearch.deprecations.fauxNativeConnector.convertPretenders',
              {
                defaultMessage:
                  'Click on "Convert to self-managed" in the Connector Configuration tab for any connector with the "Elastic-managed connector" badge.',
              }
            ),
          ],
          api: {
            method: 'POST',
            path: '/internal/enterprise_search/deprecations/convert_connectors_to_client',
            body: {
              ids: nativeConnectors.map((connector) => connector.id),
            },
          },
        },
      });
    }

    return deprecations;
  }
}
