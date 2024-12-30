/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { HttpLogic } from '../../../../../shared/http';

import {
  CrawlerDomainValidationResultChange,
  CrawlerDomainValidationResultFromServer,
  CrawlerDomainValidationStepName,
  CrawlerDomainValidationStepState,
} from '../../types';

export const extractDomainAndEntryPointFromUrl = (
  url: string
): { domain: string; entryPoint: string } => {
  let domain = url;
  let entryPoint = '/';

  const pathSlashIndex = url.search(/[^\:\/]\//);
  if (pathSlashIndex !== -1) {
    domain = url.substring(0, pathSlashIndex + 1);
    entryPoint = url.substring(pathSlashIndex + 1);
  }

  return { domain, entryPoint };
};

export const getDomainWithProtocol = async (domain: string) => {
  const { http } = HttpLogic.values;

  if (!domain.startsWith('https://') && !domain.startsWith('http://')) {
    try {
      const route = '/internal/app_search/crawler/validate_url';
      const checks = ['tcp', 'url_request'];

      const httpsCheckData: CrawlerDomainValidationResultFromServer = await http.post(route, {
        body: JSON.stringify({ url: `https://${domain}`, checks }),
      });
      if (httpsCheckData.valid) {
        return `https://${domain}`;
      }

      const httpCheckData: CrawlerDomainValidationResultFromServer = await http.post(route, {
        body: JSON.stringify({ url: `http://${domain}`, checks }),
      });
      if (httpCheckData.valid) {
        return `http://${domain}`;
      }
    } catch (error) {
      // Do nothing as later validation steps will catch errors
    }
  }

  return domain;
};

export const domainValidationStateToPanelColor = (
  state: CrawlerDomainValidationStepState
): 'success' | 'warning' | 'danger' | 'subdued' => {
  switch (state) {
    case 'valid':
      return 'success';
    case 'warning':
      return 'warning';
    case 'invalid':
      return 'danger';
    default:
      return 'subdued';
  }
};

const allFailureResultChanges: CrawlerDomainValidationResultChange = {
  networkConnectivity: {
    state: 'invalid',
    message: i18n.translate(
      'xpack.enterpriseSearch.appSearch.crawler.addDomainForm.networkConnectivityFailureMessage',
      {
        defaultMessage:
          'Unable to establish a network connection because the "Initial validation" check failed.',
      }
    ),
  },
  indexingRestrictions: {
    state: 'invalid',
    message: i18n.translate(
      'xpack.enterpriseSearch.appSearch.crawler.addDomainForm.indexingRestrictionsFailureMessage',
      {
        defaultMessage:
          'Unable to determine indexing restrictions because the "Network connectivity" check failed.',
      }
    ),
  },
  contentVerification: {
    state: 'invalid',
    message: i18n.translate(
      'xpack.enterpriseSearch.appSearch.crawler.addDomainForm.contentVerificationFailureMessage',
      {
        defaultMessage:
          'Unable to verify content because the "Indexing restrictions" check failed.',
      }
    ),
  },
};

export const domainValidationFailureResultChange = (
  stepName: CrawlerDomainValidationStepName
): CrawlerDomainValidationResultChange => {
  switch (stepName) {
    case 'initialValidation':
      return allFailureResultChanges;
    case 'networkConnectivity':
      return {
        indexingRestrictions: allFailureResultChanges.indexingRestrictions,
        contentVerification: allFailureResultChanges.contentVerification,
      };
    case 'indexingRestrictions':
      return {
        contentVerification: allFailureResultChanges.contentVerification,
      };
    default:
      return {};
  }
};
