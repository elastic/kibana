/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const getDeleteActionDescription = (isCrawler: boolean): string =>
  isCrawler
    ? i18n.translate(
        'xpack.enterpriseSearch.content.connectors.connectorTable.column.actions.deleteCrawlerDescription',
        { defaultMessage: 'Delete this crawler' }
      )
    : i18n.translate(
        'xpack.enterpriseSearch.content.connectors.connectorTable.column.actions.deleteContentCrawlerDescription',
        { defaultMessage: 'Delete this content crawler' }
      );

export const getTableCaption = (isCrawler: boolean): string =>
  isCrawler
    ? i18n.translate('xpack.enterpriseSearch.connectorsTable.table.availableCrawlersTableCaption', {
        defaultMessage: 'Available crawlers table',
      })
    : i18n.translate(
        'xpack.enterpriseSearch.connectorsTable.table.availableConnectorsTableCaption',
        { defaultMessage: 'Available content crawlers table' }
      );

export const getNoItemsMessage = (isCrawler: boolean): string =>
  isCrawler
    ? i18n.translate('xpack.enterpriseSearch.connectorsTable.table.noCrawlersResultsMessage', {
        defaultMessage: 'No crawlers found',
      })
    : i18n.translate('xpack.enterpriseSearch.connectorsTable.table.noResultsMessage', {
        defaultMessage: 'No content crawlers found',
      });
