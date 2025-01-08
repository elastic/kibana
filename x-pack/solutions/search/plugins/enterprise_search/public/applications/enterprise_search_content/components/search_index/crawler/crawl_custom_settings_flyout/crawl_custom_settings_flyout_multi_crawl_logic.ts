/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { ConnectorScheduling } from '@kbn/search-connectors';

import { CrawlerCustomSchedulesServer } from '../../../../../../../common/types/crawler';

import { CrawlerIndex } from '../../../../../../../common/types/indices';
import { Actions } from '../../../../../shared/api_logic/create_api_logic';
import { flashAPIErrors } from '../../../../../shared/flash_messages';
import { HttpLogic } from '../../../../../shared/http';
import { DomainConfig, CrawlerCustomSchedule } from '../../../../api/crawler/types';
import {
  crawlerCustomSchedulingServerToClient,
  crawlerCustomSchedulingClientToServer,
} from '../../../../api/crawler/utils';
import { IndexNameLogic } from '../../index_name_logic';

import { IndexViewLogic } from '../../index_view_logic';

import {
  CrawlCustomSettingsFlyoutDomainConfigLogic,
  domainConfigsToDomainConfigMap,
} from './crawl_custom_settings_flyout_domain_logic';

import { filterSeedUrlsByDomainUrls } from './crawl_custom_settings_flyout_logic';
import {
  PostCustomSchedulingApiLogic,
  PostCustomSchedulingArgs,
} from './crawl_custom_settings_flyout_schedule_api_logic';

export interface CrawlCustomSettingsFlyoutMultiCrawlLogicValues {
  crawlerConfigActiveTab: number;
  crawlerConfigurations: CrawlerCustomSchedule[];
  crawlerConfigurationsWithDomainData: CrawlerCustomSchedule[];
  index: CrawlerIndex;
  domainUrls: string[];
  domainConfigs: DomainConfig[];
  domainConfigMap: {
    [key: string]: DomainConfig;
  };
  crawlerCustomSchedulingIsValid: boolean;
}

type PostCustomSchedulingApiValues = Actions<PostCustomSchedulingArgs, {}>;

export interface CrawlCustomSettingsFlyoutMultiCrawlLogicActions {
  fetchCustomScheduling(): void;
  postCustomScheduling(): void;
  onReceiveCrawlerCustomScheduling(crawlerConfigurations: CrawlerCustomSchedule[]): {
    crawlerConfigurations: CrawlerCustomSchedule[];
  };
  onAddCustomCrawler(index: number): { index: number };
  onDeleteCustomCrawler(index: number): { index: number };
  onSelectCrawlerConfigActiveTab(crawlerConfigActiveTab: number): {
    crawlerConfigActiveTab: number;
  };
  onSelectCustomEntryPointUrls(
    index: number,
    entryPointUrls: string[]
  ): { index: number; entryPointUrls: string[] };
  onSelectCustomSitemapUrls(
    index: number,
    sitemapUrls: string[]
  ): { index: number; sitemapUrls: string[] };
  onSelectDomainUrls(index: number, domainUrls: string[]): { index: number; domainUrls: string[] };
  onSelectEntryPointUrls(
    index: number,
    entryPointUrls: string[]
  ): { index: number; entryPointUrls: string[] };
  onSelectMaxCrawlDepth(
    index: number,
    maxCrawlDepth: number
  ): { index: number; maxCrawlDepth: number };
  onSelectSitemapUrls(
    index: number,
    sitemapUrls: string[]
  ): { index: number; sitemapUrls: string[] };
  setConnectorSchedulingInterval(
    index: number,
    newSchedule: ConnectorScheduling
  ): {
    index: number;
    newSchedule: ConnectorScheduling;
  };
  onSetConnectorSchedulingEnabled(
    index: number,
    enabled: boolean
  ): {
    index: number;
    enabled: boolean;
  };
  toggleIncludeSitemapsInRobotsTxt(index: number): { index: number };
  makePostCustomSchedulingRequest: PostCustomSchedulingApiValues['makeRequest'];
}

const defaulCrawlerConfiguration: CrawlerCustomSchedule = {
  scheduleKey: 'crawler_0',
  name: 'Crawler 0',
  maxCrawlDepth: 2,
  customEntryPointUrls: [],
  customSitemapUrls: [],
  includeSitemapsInRobotsTxt: true,
  selectedDomainUrls: [],
  selectedEntryPointUrls: [],
  selectedSitemapUrls: [],
  interval: '0 0 0 * * ?',
  enabled: false,
  sitemapUrls: [],
  entryPointUrls: [],
};

export const CrawlCustomSettingsFlyoutMultiCrawlLogic = kea<
  MakeLogicType<
    CrawlCustomSettingsFlyoutMultiCrawlLogicValues,
    CrawlCustomSettingsFlyoutMultiCrawlLogicActions
  >
>({
  path: ['enterprise_search', 'crawler', 'crawl_custom_settings_flyout_multi_crawl_logic'],
  connect: {
    actions: [
      PostCustomSchedulingApiLogic,
      ['makeRequest as makePostCustomSchedulingRequest'],
      CrawlCustomSettingsFlyoutDomainConfigLogic,
      ['onRecieveDomainConfigData'],
    ],
    values: [
      IndexViewLogic,
      ['index'],
      CrawlCustomSettingsFlyoutDomainConfigLogic,
      ['domainConfigs', 'domainConfigMap'],
    ],
  },
  actions: () => ({
    fetchCustomScheduling: true,
    postCustomScheduling: true,
    onAddCustomCrawler: (index) => ({ index }),
    onDeleteCustomCrawler: (index) => ({ index }),
    onReceiveCrawlerCustomScheduling: (crawlerConfigurations) => ({ crawlerConfigurations }),
    onSelectCrawlerConfigActiveTab: (crawlerConfigActiveTab) => ({ crawlerConfigActiveTab }),
    onSelectCustomEntryPointUrls: (index, entryPointUrls) => ({ index, entryPointUrls }),
    onSelectCustomSitemapUrls: (index, sitemapUrls) => ({ index, sitemapUrls }),
    onSelectDomainUrls: (index, domainUrls) => ({ index, domainUrls }),
    onSelectEntryPointUrls: (index, entryPointUrls) => ({ index, entryPointUrls }),
    onSelectMaxCrawlDepth: (index, maxCrawlDepth) => ({ index, maxCrawlDepth }),
    onSelectSitemapUrls: (index, sitemapUrls) => ({ index, sitemapUrls }),
    onSetConnectorSchedulingEnabled: (index, enabled) => ({ index, enabled }),
    setConnectorSchedulingInterval: (index, newSchedule) => ({ index, newSchedule }),
    toggleIncludeSitemapsInRobotsTxt: (index) => ({ index }),
  }),
  reducers: () => ({
    crawlerConfigActiveTab: [
      0,
      {
        // @ts-expect-error upgrade typescript v5.1.6
        onSelectCrawlerConfigActiveTab: (_, { crawlerConfigActiveTab }) => crawlerConfigActiveTab,
        onDeleteCustomCrawler: () => 0,
      },
    ],
    crawlerConfigurations: [
      [defaulCrawlerConfiguration],
      {
        // @ts-expect-error upgrade typescript v5.1.6
        onReceiveCrawlerCustomScheduling: (_, { crawlerConfigurations }) => {
          // Handle case with no custom scheduling returned from server
          return crawlerConfigurations.length > 0 // @ts-expect-error upgrade typescript v5.1.6
            ? crawlerConfigurations.map((configuration) => ({
                ...defaulCrawlerConfiguration,
                ...configuration,
              }))
            : [defaulCrawlerConfiguration];
        },
        // @ts-expect-error upgrade typescript v5.1.6
        onAddCustomCrawler: (state, { index }) => {
          let newScheduleKey = `crawler_${index}`;
          let suffix = index;

          // Check if the newScheduleKey already exists in the array
          // @ts-expect-error upgrade typescript v5.1.6
          const existingKeys = state.map((crawler) => crawler.scheduleKey);
          if (existingKeys.includes(newScheduleKey)) {
            // Handle the case where a duplicate scheduleKey is found
            while (existingKeys.includes(`${newScheduleKey}_${suffix}`)) {
              suffix++;
            }
            newScheduleKey = `${newScheduleKey}_${suffix}`;
          }
          return [
            ...state,
            {
              ...defaulCrawlerConfiguration,
              name: `Crawler ${suffix}`,
              scheduleKey: newScheduleKey,
            },
          ];
        },
        // @ts-expect-error upgrade typescript v5.1.6
        onDeleteCustomCrawler: (state, { index }) => {
          // @ts-expect-error upgrade typescript v5.1.6
          return state.filter((_, i) => i !== index);
        },
        // @ts-expect-error upgrade typescript v5.1.6
        onSelectMaxCrawlDepth: (state, { index, maxCrawlDepth }) => {
          // @ts-expect-error upgrade typescript v5.1.6
          return state.map((crawler, i) => (i === index ? { ...crawler, maxCrawlDepth } : crawler));
        },
        // @ts-expect-error upgrade typescript v5.1.6
        onSelectCustomEntryPointUrls: (state, { index, entryPointUrls }) => {
          // @ts-expect-error upgrade typescript v5.1.6
          return state.map((crawler, i) =>
            i === index ? { ...crawler, customEntryPointUrls: entryPointUrls } : crawler
          );
        },
        // @ts-expect-error upgrade typescript v5.1.6
        onSelectCustomSitemapUrls: (state, { index, sitemapUrls }) => {
          // @ts-expect-error upgrade typescript v5.1.6
          return state.map((crawler, i) =>
            i === index ? { ...crawler, customSitemapUrls: sitemapUrls } : crawler
          );
        },
        // @ts-expect-error upgrade typescript v5.1.6
        toggleIncludeSitemapsInRobotsTxt: (state, { index }) => {
          // @ts-expect-error upgrade typescript v5.1.6
          return state.map((crawler, i) =>
            i === index
              ? { ...crawler, includeSitemapsInRobotsTxt: !crawler.includeSitemapsInRobotsTxt }
              : crawler
          );
        },
        // @ts-expect-error upgrade typescript v5.1.6
        onSelectDomainUrls: (state, { index, domainUrls }) => {
          // @ts-expect-error upgrade typescript v5.1.6
          return state.map((crawler, i) =>
            i === index
              ? {
                  ...crawler,
                  selectedDomainUrls: domainUrls,
                  selectedEntryPointUrls: filterSeedUrlsByDomainUrls(
                    crawler.selectedEntryPointUrls,
                    domainUrls
                  ),
                  selectedSitemapUrls: filterSeedUrlsByDomainUrls(
                    crawler.selectedSitemapUrls,
                    domainUrls
                  ),
                }
              : crawler
          );
        },
        // @ts-expect-error upgrade typescript v5.1.6
        onSelectEntryPointUrls: (state, { index, entryPointUrls }) => {
          // @ts-expect-error upgrade typescript v5.1.6
          return state.map((crawler, i) =>
            i === index ? { ...crawler, selectedEntryPointUrls: entryPointUrls } : crawler
          );
        },
        // @ts-expect-error upgrade typescript v5.1.6
        onSelectSitemapUrls: (state, { index, sitemapUrls }) => {
          // @ts-expect-error upgrade typescript v5.1.6
          return state.map((crawler, i) =>
            i === index ? { ...crawler, selectedSitemapUrls: sitemapUrls } : crawler
          );
        },
        // @ts-expect-error upgrade typescript v5.1.6
        onSetConnectorSchedulingEnabled: (state, { index, enabled }) => {
          // @ts-expect-error upgrade typescript v5.1.6
          return state.map((crawler, i) => (i === index ? { ...crawler, enabled } : crawler));
        },
        // @ts-expect-error upgrade typescript v5.1.6
        setConnectorSchedulingInterval: (state, { index, newSchedule }) => {
          const { interval } = newSchedule;
          // @ts-expect-error upgrade typescript v5.1.6
          return state.map((crawler, i) => (i === index ? { ...crawler, interval } : crawler));
        },
        // @ts-expect-error upgrade typescript v5.1.6
        onRecieveDomainConfigData: (state, { domainConfigs }) => {
          const domainConfigsMap = domainConfigsToDomainConfigMap(domainConfigs);
          // @ts-expect-error upgrade typescript v5.1.6
          return state.map((crawler) => {
            const entryPointUrls = crawler.selectedDomainUrls.flatMap(
              // @ts-expect-error upgrade typescript v5.1.6
              (selectedDomainUrl) => domainConfigsMap[selectedDomainUrl].seedUrls
            );
            // @ts-expect-error upgrade typescript v5.1.6
            const selectedEntryPointUrls = crawler.customEntryPointUrls.filter((entryPointUrl) =>
              entryPointUrls.includes(entryPointUrl)
            );
            const customEntryPointUrls = crawler.customEntryPointUrls.filter(
              // @ts-expect-error upgrade typescript v5.1.6
              (entryPointUrl) => !entryPointUrls.includes(entryPointUrl)
            );
            const sitemapUrls = crawler.selectedDomainUrls.flatMap(
              // @ts-expect-error upgrade typescript v5.1.6
              (selectedDomainUrl) => domainConfigsMap[selectedDomainUrl].sitemapUrls
            );
            // @ts-expect-error upgrade typescript v5.1.6
            const selectedSitemapUrls = crawler.customSitemapUrls.filter((sitemapUrl) =>
              sitemapUrls.includes(sitemapUrl)
            );
            const customSitemapUrls = crawler.customSitemapUrls.filter(
              // @ts-expect-error upgrade typescript v5.1.6
              (sitemapUrl) => !sitemapUrls.includes(sitemapUrl)
            );

            return {
              ...crawler,
              entryPointUrls,
              selectedEntryPointUrls,
              customEntryPointUrls,
              sitemapUrls,
              selectedSitemapUrls,
              customSitemapUrls,
            };
          });
        },
      },
    ],
  }),
  selectors: () => ({
    crawlerConfigurationsWithDomainData: [
      (selectors) => [selectors.domainConfigMap, selectors.crawlerConfigurations],
      (
        domainConfigMap: { [key: string]: DomainConfig },
        crawlerConfigs: CrawlerCustomSchedule[]
      ): CrawlerCustomSchedule[] =>
        crawlerConfigs.map((crawlerConfig) => {
          const entryPointUrls = crawlerConfig.selectedDomainUrls.flatMap(
            (selectedDomainUrl) => domainConfigMap[selectedDomainUrl].seedUrls
          );
          const sitemapUrls = crawlerConfig.selectedDomainUrls.flatMap(
            (selectedDomainUrl) => domainConfigMap[selectedDomainUrl].sitemapUrls
          );

          return {
            ...crawlerConfig,
            entryPointUrls,
            sitemapUrls,
          };
        }),
    ],
    crawlerCustomSchedulingIsValid: [
      (selectors) => [selectors.crawlerConfigurations],
      (crawlerConfigs: CrawlerCustomSchedule[]): boolean =>
        crawlerConfigs.every((config) => config.selectedDomainUrls.length > 0),
    ],
  }),
  listeners: ({ actions, values }) => ({
    fetchCustomScheduling: async () => {
      const { http } = HttpLogic.values;
      const { indexName } = IndexNameLogic.values;

      try {
        const customSchedulingResponse = await http.get<CrawlerCustomSchedulesServer>(
          `/internal/enterprise_search/indices/${indexName}/crawler/custom_scheduling`
        );
        const customScheduling = crawlerCustomSchedulingServerToClient(customSchedulingResponse);
        actions.onReceiveCrawlerCustomScheduling(customScheduling);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    postCustomScheduling: async () => {
      const { indexName } = IndexNameLogic.values;
      const { crawlerConfigurations } = values;
      const customScheduling = crawlerCustomSchedulingClientToServer(crawlerConfigurations);
      try {
        actions.makePostCustomSchedulingRequest({ indexName, customScheduling });
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
