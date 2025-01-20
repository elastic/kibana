/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CloudSetup } from '@kbn/cloud-plugin/server';
import { DeprecationsDetails } from '@kbn/core-deprecations-common';
import { GetDeprecationsContext, RegisterDeprecationsConfig } from '@kbn/core-deprecations-server';

import { hasFleetServers } from '@kbn/fleet-plugin/server';
import { isAgentlessEnabled } from '@kbn/fleet-plugin/server';
import { i18n } from '@kbn/i18n';
import { Connector, fetchConnectors } from '@kbn/search-connectors';

import { ConfigType } from '..';

const NATIVE_SERVICE_TYPES = [
  'azure_blob_storage',
  'box',
  'confluence',
  'dropbox',
  'github',
  'gmail',
  'google_cloud_storage',
  'google_drive',
  'jira',
  'mssql',
  'mongodb',
  'mysql',
  'network_drive',
  'notion',
  'onedrive',
  'oracle',
  'outlook',
  'postgresql',
  's3',
  'salesforce',
  'servicenow',
  'sharepoint_online',
  'sharepoint_server',
  'slack',
  'microsoft_teams',
  'zoom',
];

export const getRegisteredDeprecations = (
  config: ConfigType,
  cloud: CloudSetup,
  docsUrl: string
): RegisterDeprecationsConfig => {
  return {
    getDeprecations: async (ctx: GetDeprecationsContext) => {
      const hasAgentless = isAgentlessEnabled();
      const hasFleetServer = await hasFleetServers(
        ctx.esClient.asInternalUser,
        ctx.savedObjectsClient
      );
      const entSearchDetails = getEnterpriseSearchNodeDeprecation(config, cloud, docsUrl);
      const [crawlerDetails, nativeConnectorsDetails] = await Promise.all([
        await getCrawlerDeprecations(ctx, docsUrl),
        await getNativeConnectorDeprecations(ctx, hasAgentless, hasFleetServer, cloud, docsUrl),
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
  if (config.host) {
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
          defaultMessage: 'Enterprise Search host(s) must be removed',
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
 * if the customer is using Native Connectors, agentless is available, but the integration server is missing, they are told that Integrations Server must be added
 * if the customer is using Native Connectors, and agentless is unavailable, they are told that they must convert their connectors to Connector Clients
 * if the customer was using "native" connectors that don't match our connector service types, they must delete them or convert them to connector clients.
 */
export async function getNativeConnectorDeprecations(
  ctx: GetDeprecationsContext,
  hasAgentless: boolean,
  hasFleetServer: boolean,
  cloud: CloudSetup,
  docsUrl: string
): Promise<DeprecationsDetails[]> {
  const client = ctx.esClient.asInternalUser;
  const connectors: Connector[] = await fetchConnectors(client, undefined, false, undefined);
  const nativeConnectors = connectors.filter((hit) => hit.is_native);
  if (nativeConnectors.length === 0) {
    return []; // no deprecations to register if there are no Native Connectors
  } else {
    const deprecations: DeprecationsDetails[] = [];

    if (nativeConnectors.length > 0 && !hasAgentless) {
      // you can't have elastic-managed connectors in an environment that Elastic doesn't manage
      // ... and agentless is available in every Elastic-managed environment

      deprecations.push({
        level: 'critical',
        deprecationType: 'feature',
        title: i18n.translate('xpack.enterpriseSearch.deprecations.notManaged.title', {
          defaultMessage:
            'Connectors with `is_native: true` are not supported in self-managed environments',
        }),
        message: {
          type: 'markdown',
          content: i18n.translate('xpack.enterpriseSearch.deprecations.notManaged.message', {
            defaultMessage:
              '"Native Connectors" are managed services in Elastic-managed environments such as Elastic Cloud Hosted and ' +
              'Elastic Cloud Serverless. Any connectors with `is_native: true` must be converted to connector clients or deleted ' +
              'before this upgrade can proceed.',
          }),
        },
        documentationUrl: docsUrl,
        correctiveActions: {
          manualSteps: [
            i18n.translate('xpack.enterpriseSearch.deprecations.notManaged.listConnectors', {
              defaultMessage: 'Enumerate all connector records',
            }),
            i18n.translate('xpack.enterpriseSearch.deprecations.notManaged.convertPretenders', {
              defaultMessage:
                'On the connector Overview tab, select "Convert Connector" for any Native Connectors.',
            }),
          ],
          api: {
            method: 'POST',
            path: '/internal/enterprise_search/deprecations/convert_connectors_to_client',
            body: {
              ids: nativeConnectors.map((it) => it.id),
            },
          },
        },
      });
    } else {
      const nativeTypesStr = '- `' + NATIVE_SERVICE_TYPES.join('`\n- `') + '`\n\n';
      const fauxNativeConnectors = nativeConnectors.filter(
        (hit) => !NATIVE_SERVICE_TYPES.includes(hit.service_type!)
      );

      if (fauxNativeConnectors.length > 0) {
        // There are some illegal service_types in their native connectors
        deprecations.push({
          level: 'critical',
          deprecationType: 'feature',
          title: i18n.translate('xpack.enterpriseSearch.deprecations.fauxNativeConnector.title', {
            defaultMessage: 'Native connectors must be of supported service types',
          }),
          message: {
            type: 'markdown',
            content: i18n.translate(
              'xpack.enterpriseSearch.deprecations.fauxNativeConnector.message',
              {
                values: { serviceTypes: nativeTypesStr },
                defaultMessage:
                  'Not all service types are supported by Elastic-managed connectors.\n\n' +
                  'The following service types are supported for Elastic-managed connectors:\n' +
                  '{serviceTypes}' +
                  'Unsupported service types must be converted to Connector Clients before upgrading. ' +
                  'This is a lossless operation, and can be attempted with "quick resolve".\n\n' +
                  'Alternatively, deleting these connectors with mismatched service types will also unblock your upgrade.',
              }
            ),
          },
          documentationUrl: docsUrl,
          correctiveActions: {
            manualSteps: [
              i18n.translate(
                'xpack.enterpriseSearch.deprecations.fauxNativeConnector.listConnectors',
                {
                  defaultMessage: 'Enumerate all connector records',
                }
              ),
              i18n.translate(
                'xpack.enterpriseSearch.deprecations.fauxNativeConnector.convertPretenders',
                {
                  defaultMessage:
                    'Select "Convert to Client" for any connectors where `is_native: true` but the `service_type` is NOT supported, per the list above.',
                }
              ),
            ],
            api: {
              method: 'POST',
              path: '/internal/enterprise_search/deprecations/convert_connectors_to_client',
              body: {
                ids: fauxNativeConnectors.map((it) => it.id),
              },
            },
          },
        });
      }

      if (hasAgentless && nativeConnectors.length > 0 && !hasFleetServer) {
        // the Integration Server is a required component in your deployment, for Agentless
        deprecations.push({
          level: 'critical',
          deprecationType: 'feature',
          title: i18n.translate(
            'xpack.enterpriseSearch.deprecations.missingIntegrationServer.title',
            {
              defaultMessage: 'Integration Server must be provisioned',
            }
          ),
          message: {
            type: 'markdown',
            content: i18n.translate(
              'xpack.enterpriseSearch.deprecations.missingIntegrationServer.message',
              {
                defaultMessage:
                  'In versions >= 9.x, Elastic-managed connectors are run through the Elastic Integrations ecosystem. ' +
                  'This requires the Integration Server to be present in your deployment.\n\n' +
                  'Unless you are running more than 1000 connectors, a single instance of the smallest Integration Server' +
                  'should be sufficient.\n\n' +
                  'For full details, see the documentation.' +
                  `\n\n[Click here to manage your deployment](${
                    cloud.baseUrl + '/deployments/' + cloud.deploymentId
                  }).`,
              }
            ),
          },
          documentationUrl: docsUrl,
          correctiveActions: {
            manualSteps: [
              i18n.translate(
                'xpack.enterpriseSearch.deprecations.missingIntegrationServer.gotocloud',
                {
                  values: { baseUrl: cloud.baseUrl },
                  defaultMessage:
                    'Go to {baseUrl} and select this deployment. Or click the link above to go straight there.',
                }
              ),
              i18n.translate(
                'xpack.enterpriseSearch.deprecations.missingIntegrationServer.clickedit',
                {
                  defaultMessage: "Click the 'Edit' tab",
                }
              ),
              i18n.translate(
                'xpack.enterpriseSearch.deprecations.missingIntegrationServer.scrolldown',
                {
                  defaultMessage: "Scroll down to the 'Integration Server' section",
                }
              ),
              i18n.translate(
                'xpack.enterpriseSearch.deprecations.missingIntegrationServer.addCapacity',
                {
                  defaultMessage:
                    "Click the button to '+ Add capacity' and choose a size/count. For most customers," +
                    'the smallest option in a single zone is sufficient.',
                }
              ),
              i18n.translate(
                'xpack.enterpriseSearch.deprecations.missingIntegrationServer.clicksave',
                {
                  defaultMessage: "Click 'Save' and confirm",
                }
              ),
            ],
          },
        });
      }
    }

    return deprecations;
  }
}
