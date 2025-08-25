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
        onSelectCrawlerConfigActiveTab: (_, { crawlerConfigActiveTab }) => crawlerConfigActiveTab,
        onDeleteCustomCrawler: () => 0,
      },
    ],
    crawlerConfigurations: [
      [defaulCrawlerConfiguration],
      {
        onReceiveCrawlerCustomScheduling: (_, { crawlerConfigurations }) => {
          // Handle case with no custom scheduling returned from server
          return crawlerConfigurations.length > 0
            ? crawlerConfigurations.map((configuration) => ({
                ...defaulCrawlerConfiguration,
                ...configuration,
              }))
            : [defaulCrawlerConfiguration];
        },
        onAddCustomCrawler: (state, { index }) => {
          let newScheduleKey = `crawler_${index}`;
          let suffix = index;

          // Check if the newScheduleKey already exists in the array
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
        onDeleteCustomCrawler: (state, { index }) => {
          return state.filter((_, i) => i !== index);
        },
        onSelectMaxCrawlDepth: (state, { index, maxCrawlDepth }) => {
          return state.map((crawler, i) => (i === index ? { ...crawler, maxCrawlDepth } : crawler));
        },
        onSelectCustomEntryPointUrls: (state, { index, entryPointUrls }) => {
          return state.map((crawler, i) =>
            i === index ? { ...crawler, customEntryPointUrls: entryPointUrls } : crawler
          );
        },
        onSelectCustomSitemapUrls: (state, { index, sitemapUrls }) => {
          return state.map((crawler, i) =>
            i === index ? { ...crawler, customSitemapUrls: sitemapUrls } : crawler
          );
        },
        toggleIncludeSitemapsInRobotsTxt: (state, { index }) => {
          return state.map((crawler, i) =>
            i === index
              ? { ...crawler, includeSitemapsInRobotsTxt: !crawler.includeSitemapsInRobotsTxt }
              : crawler
          );
        },
        onSelectDomainUrls: (state, { index, domainUrls }) => {
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
        onSelectEntryPointUrls: (state, { index, entryPointUrls }) => {
          return state.map((crawler, i) =>
            i === index ? { ...crawler, selectedEntryPointUrls: entryPointUrls } : crawler
          );
        },
        onSelectSitemapUrls: (state, { index, sitemapUrls }) => {
          return state.map((crawler, i) =>
            i === index ? { ...crawler, selectedSitemapUrls: sitemapUrls } : crawler
          );
        },
        onSetConnectorSchedulingEnabled: (state, { index, enabled }) => {
          return state.map((crawler, i) => (i === index ? { ...crawler, enabled } : crawler));
        },
        setConnectorSchedulingInterval: (state, { index, newSchedule }) => {
          const { interval } = newSchedule;
          return state.map((crawler, i) => (i === index ? { ...crawler, interval } : crawler));
        },
        onRecieveDomainConfigData: (state, { domainConfigs }) => {
          const domainConfigsMap = domainConfigsToDomainConfigMap(domainConfigs);
          return state.map((crawler) => {
            const entryPointUrls = crawler.selectedDomainUrls.flatMap(
              (selectedDomainUrl) => domainConfigsMap[selectedDomainUrl].seedUrls
            );
            const selectedEntryPointUrls = crawler.customEntryPointUrls.filter((entryPointUrl) =>
              entryPointUrls.includes(entryPointUrl)
            );
            const customEntryPointUrls = crawler.customEntryPointUrls.filter(
              (entryPointUrl) => !entryPointUrls.includes(entryPointUrl)
            );
            const sitemapUrls = crawler.selectedDomainUrls.flatMap(
              (selectedDomainUrl) => domainConfigsMap[selectedDomainUrl].sitemapUrls
            );
            const selectedSitemapUrls = crawler.customSitemapUrls.filter((sitemapUrl) =>
              sitemapUrls.includes(sitemapUrl)
            );
            const customSitemapUrls = crawler.customSitemapUrls.filter(
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
