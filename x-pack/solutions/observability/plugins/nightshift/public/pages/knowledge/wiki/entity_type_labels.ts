/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { WikiEntityType, WikiPageStatus, WikiStatusFilter } from './types';

export const getWikiEntityTypeSingularLabel = (entityType: WikiEntityType): string => {
  switch (entityType) {
    case 'integration':
      return i18n.translate('xpack.nightshift.knowledge.wiki.entityType.integrationSingularLabel', {
        defaultMessage: 'Integration',
      });
    case 'service':
      return i18n.translate('xpack.nightshift.knowledge.wiki.entityType.serviceSingularLabel', {
        defaultMessage: 'Service',
      });
    case 'alert':
      return i18n.translate('xpack.nightshift.knowledge.wiki.entityType.alertSingularLabel', {
        defaultMessage: 'Alert',
      });
    case 'runbook':
      return i18n.translate('xpack.nightshift.knowledge.wiki.entityType.runbookSingularLabel', {
        defaultMessage: 'Runbook',
      });
    case 'query':
      return i18n.translate('xpack.nightshift.knowledge.wiki.entityType.querySingularLabel', {
        defaultMessage: 'Query',
      });
    case 'dashboard':
      return i18n.translate('xpack.nightshift.knowledge.wiki.entityType.dashboardSingularLabel', {
        defaultMessage: 'Dashboard',
      });
    case 'postmortem':
      return i18n.translate('xpack.nightshift.knowledge.wiki.entityType.postmortemSingularLabel', {
        defaultMessage: 'Postmortem',
      });
    case 'topic':
      return i18n.translate('xpack.nightshift.knowledge.wiki.entityType.topicSingularLabel', {
        defaultMessage: 'Topic',
      });
    case 'glossary':
      return i18n.translate('xpack.nightshift.knowledge.wiki.entityType.glossarySingularLabel', {
        defaultMessage: 'Glossary',
      });
    case 'ontology':
      return i18n.translate('xpack.nightshift.knowledge.wiki.entityType.ontologySingularLabel', {
        defaultMessage: 'Ontology',
      });
  }
};

export const getWikiEntityTypeLabel = (entityType: WikiEntityType): string => {
  switch (entityType) {
    case 'integration':
      return i18n.translate('xpack.nightshift.knowledge.wiki.entityType.integrationLabel', {
        defaultMessage: 'Integrations',
      });
    case 'service':
      return i18n.translate('xpack.nightshift.knowledge.wiki.entityType.serviceLabel', {
        defaultMessage: 'Services',
      });
    case 'alert':
      return i18n.translate('xpack.nightshift.knowledge.wiki.entityType.alertLabel', {
        defaultMessage: 'Alerts',
      });
    case 'runbook':
      return i18n.translate('xpack.nightshift.knowledge.wiki.entityType.runbookLabel', {
        defaultMessage: 'Runbooks',
      });
    case 'query':
      return i18n.translate('xpack.nightshift.knowledge.wiki.entityType.queryLabel', {
        defaultMessage: 'Queries',
      });
    case 'dashboard':
      return i18n.translate('xpack.nightshift.knowledge.wiki.entityType.dashboardLabel', {
        defaultMessage: 'Dashboards',
      });
    case 'postmortem':
      return i18n.translate('xpack.nightshift.knowledge.wiki.entityType.postmortemLabel', {
        defaultMessage: 'Postmortems',
      });
    case 'topic':
      return i18n.translate('xpack.nightshift.knowledge.wiki.entityType.topicLabel', {
        defaultMessage: 'Topics',
      });
    case 'glossary':
      return i18n.translate('xpack.nightshift.knowledge.wiki.entityType.glossaryLabel', {
        defaultMessage: 'Glossary',
      });
    case 'ontology':
      return i18n.translate('xpack.nightshift.knowledge.wiki.entityType.ontologyLabel', {
        defaultMessage: 'Ontology',
      });
  }
};

export const getWikiStatusLabel = (status: WikiPageStatus): string => {
  switch (status) {
    case 'established':
      return i18n.translate('xpack.nightshift.knowledge.wiki.status.establishedLabel', {
        defaultMessage: 'Established',
      });
    case 'tentative':
      return i18n.translate('xpack.nightshift.knowledge.wiki.status.tentativeLabel', {
        defaultMessage: 'Tentative',
      });
    case 'archived':
      return i18n.translate('xpack.nightshift.knowledge.wiki.status.archivedLabel', {
        defaultMessage: 'Archived',
      });
  }
};

export const getWikiStatusFilterLabel = (filter: WikiStatusFilter): string => {
  if (filter === 'all') {
    return i18n.translate('xpack.nightshift.knowledge.wiki.statusFilter.allLabel', {
      defaultMessage: 'All',
    });
  }
  return getWikiStatusLabel(filter);
};
