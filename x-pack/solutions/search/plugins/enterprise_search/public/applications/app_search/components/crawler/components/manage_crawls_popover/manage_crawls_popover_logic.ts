/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import { flashAPIErrors, flashSuccessToast } from '../../../../../shared/flash_messages';
import { HttpLogic } from '../../../../../shared/http';
import { EngineLogic } from '../../../engine';
import { CrawlerLogic } from '../../crawler_logic';
import { CrawlerDomain } from '../../types';

export interface ManageCrawlsPopoverLogicValues {
  isOpen: boolean;
}

export interface ManageCrawlsPopoverLogicActions {
  closePopover(): void;
  reApplyCrawlRules(domain?: CrawlerDomain): { domain: CrawlerDomain };
  togglePopover(): void;
}

export const ManageCrawlsPopoverLogic = kea<
  MakeLogicType<ManageCrawlsPopoverLogicValues, ManageCrawlsPopoverLogicActions>
>({
  path: ['enterprise_search', 'app_search', 'crawler', 'manage_crawls_popover'],
  actions: () => ({
    closePopover: true,
    reApplyCrawlRules: (domain) => ({ domain }),
    togglePopover: true,
  }),
  reducers: () => ({
    isOpen: [
      false,
      {
        closePopover: () => false,
        // @ts-expect-error upgrade typescript v5.1.6
        togglePopover: (currentIsOpen) => !currentIsOpen,
      },
    ],
  }),
  listeners: ({ actions }) => ({
    reApplyCrawlRules: async ({ domain }) => {
      const { engineName } = EngineLogic.values;
      const { http } = HttpLogic.values;
      const requestBody: { domains?: string[] } = {};

      if (domain) {
        requestBody.domains = [domain.url];
      }

      try {
        await http.post(`/internal/app_search/engines/${engineName}/crawler/process_crawls`, {
          body: JSON.stringify(requestBody),
        });

        flashSuccessToast(
          i18n.translate(
            'xpack.enterpriseSearch.appSearch.crawler.manageCrawlsPopover.reApplyCrawlRules.successMessage',
            {
              defaultMessage: 'Crawl rules are being re-applied in the background',
            }
          )
        );

        CrawlerLogic.actions.fetchCrawlerData();
      } catch (e) {
        flashAPIErrors(e);
      } finally {
        actions.closePopover();
      }
    },
  }),
});
