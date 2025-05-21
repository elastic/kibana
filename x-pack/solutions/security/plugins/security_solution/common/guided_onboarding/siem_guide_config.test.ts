/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultGuideTranslations, getSiemGuideConfig, siemGuideId } from './siem_guide_config';
import * as i18n from './translations';

describe('getSiemGuideConfig', () => {
  it('returns a GuideConfig object with default values when no arguments are passed', () => {
    const result = getSiemGuideConfig();
    expect(result).toEqual({
      title: defaultGuideTranslations.title,
      guideName: 'Security',
      telemetryId: siemGuideId,
      completedGuideRedirectLocation: {
        appID: 'securitySolutionUI',
        path: '/dashboards',
      },
      description: defaultGuideTranslations.description,
      docs: {
        text: defaultGuideTranslations.docs,
        url: 'https://www.elastic.co/guide/en/security/current/ingest-data.html',
      },
      steps: [
        {
          id: 'add_data',
          title: defaultGuideTranslations.steps.add_data.title,
          description: {
            descriptionText: defaultGuideTranslations.steps.add_data.description,
            linkUrl: 'https://docs.elastic.co/en/integrations/endpoint',
            isLinkExternal: true,
            linkText: i18n.LINK_TEXT,
          },
          integration: 'endpoint',
          location: {
            appID: 'integrations',
            path: '/detail/endpoint/overview',
          },
        },
        {
          id: 'rules',
          title: defaultGuideTranslations.steps.rules.title,
          description: defaultGuideTranslations.steps.rules.description,
          location: {
            appID: 'securitySolutionUI',
            path: '/rules',
          },
          manualCompletion: defaultGuideTranslations.steps.rules.manualCompletion,
        },
        {
          id: 'alertsCases',
          title: defaultGuideTranslations.steps.alertsCases.title,
          description: defaultGuideTranslations.steps.alertsCases.description,
          location: {
            appID: 'securitySolutionUI',
            path: '/alerts',
          },
          manualCompletion: defaultGuideTranslations.steps.alertsCases.manualCompletion,
        },
      ],
    });
  });
});
