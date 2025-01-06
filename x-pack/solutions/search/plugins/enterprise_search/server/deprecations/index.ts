/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {GetDeprecationsContext, RegisterDeprecationsConfig} from "@kbn/core-deprecations-server";
import {DeprecationsDetails} from "@kbn/core-deprecations-common";
import {ConfigType} from "@kbn/enterprise-search-plugin/server";
import {Connector, fetchConnectors} from '@kbn/search-connectors';

import {i18n} from "@kbn/i18n";

export const getRegisteredDeprecations = (config: ConfigType, isCloud: boolean): RegisterDeprecationsConfig => {
  return {
    getDeprecations: async (ctx: GetDeprecationsContext) => {
      return [
        ...(getEnterpriseSearchNodeDeprecation(config, isCloud)),
        ...(await getCrawlerDeprecations(ctx)),
      ]
    }
  }
}

/**
 * If Enterprise Search Node is configured, it's marked as a critical deprecation
 * Warns that removing the node will disable crawlers/connectors
 */
export function getEnterpriseSearchNodeDeprecation(config: ConfigType, isCloud: boolean): DeprecationsDetails[] {
  if (config.host) {
    const steps = []
    if (isCloud) {
      steps.push(...[
        i18n.translate('xpack.enterpriseSearch.deprecations.entsearchhost.gotocloud', {
          defaultMessage: 'Go to cloud.elastic.co',
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
      ])
    } else {
      steps.push(...[
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
          defaultMessage: "Restart Kibana",
        }),
      ])
    }
    return [{
      level: 'critical',
      deprecationType: 'feature',
      title: i18n.translate('xpack.enterpriseSearch.deprecations.entsearchhost.title', {
        defaultMessage: 'Enterprise Search host(s) must be removed',
      }),
      message: i18n.translate('xpack.enterpriseSearch.deprecations.entsearchhost.message', {
        defaultMessage: 'Enterprise Search is not supported in versions >= 9.x. ' +
          'You must remove Enterprise Search node(s) from your deployment to proceed with the upgrade. ' +
          'Note that once Enterprise Search is stopped, products such as App Search, Workplace Search, and Elastic Crawler ' +
          'will cease to operate. Native Connectors will also stop running syncs, between when Enterprise Search is stopped ' +
          'and when the 9.x upgrade completes. For full details, see the documentation.',
      }),
      documentationUrl: 'https://elastic.co/guide/en/enterprise-search/current/upgrading-to-9-x.html',
      correctiveActions: {
        manualSteps: steps,
      },
    }]
  } else {
    return []
  }
}

/**
 * if the customer was using Elastic Crawler, they must delete the connector records
 */
export async function getCrawlerDeprecations(ctx: GetDeprecationsContext): Promise<DeprecationsDetails[]> {
  let crawlers: Connector[] = await getCrawlerConnectors(ctx)
  if (crawlers.length == 0){
    return [] // no deprecations to register if there are no Elastic Crawlers in the connectors index
  } else {
    return [{
      level: 'critical',
      deprecationType: 'feature',
      title: i18n.translate('xpack.enterpriseSearch.deprecations.crawler.title', {
        defaultMessage: 'Elastic Crawler metadata records in the .elastic-connectors index must be removed.',
      }),
      message: i18n.translate('xpack.enterpriseSearch.deprecations.crawler.message', {
        defaultMessage: 'Enterprise Search is not supported in versions >= 9.x. ' +
          'Therefore, Elastic Crawler is not supported in versions >= 9.x. ' +
          'In order to upgrade other Native Connectors, metadata records in the `.elastic-connectors` index specific to ' +
          'Elastic Crawler must be removed. For full details, see the documentation.',
      }),
      documentationUrl: 'https://elastic.co/guide/en/enterprise-search/current/upgrading-to-9-x.html',
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
            ids: crawlers.map(it=> it.id)
          },
        },
      },
    }]
  }
}

/**
 * Fetch the connector records for crawlers
 * @param ctx the deprecations context
 */
async function getCrawlerConnectors(ctx: GetDeprecationsContext): Promise<Connector[]>{
  const client = ctx.esClient.asInternalUser
  return await fetchConnectors(client, undefined,true, undefined)
}
