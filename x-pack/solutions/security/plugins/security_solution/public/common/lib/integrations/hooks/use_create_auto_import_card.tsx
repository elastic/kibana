/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useNavigation } from '@kbn/security-solution-navigation';
import AssistantIconSVG from '@kbn/ai-assistant-icon/svg/assistant.svg';
import { i18n } from '@kbn/i18n';
import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { EuiBadge } from '@elastic/eui';
import { useIntegrationContext } from './integration_context';
import {
  CARD_DESCRIPTION_LINE_CLAMP,
  CARD_TITLE_LINE_CLAMP,
  MAX_CARD_HEIGHT_IN_PX,
  TELEMETRY_INTEGRATION_CARD,
} from '../constants';

const TITLE = i18n.translate('xpack.securitySolution.integrations.createAutoImportCard.title', {
  defaultMessage: 'Custom integration',
});
const DESCRIPTION = i18n.translate(
  'xpack.securitySolution.integrations.createAutoImportCard.description',
  {
    defaultMessage:
      'AI-driven process to build the integration step-by-step, or upload a pre-made .zip package integration.',
  }
);
const BADGE = i18n.translate('xpack.securitySolution.integrations.createAutoImportCard.badge', {
  defaultMessage: 'New',
});

const navigation = { appId: 'integrations', path: 'create' };
const ID = 'placeholder:auto_import';

export const useCreateAutoImportCard = () => {
  const { getAppUrl, navigateTo } = useNavigation();
  const { reportLinkClick } = useIntegrationContext().telemetry;

  return useCallback((): IntegrationCardItem => {
    return {
      id: ID,
      title: TITLE,
      name: TITLE,
      titleBadge: <EuiBadge color="warning">{BADGE}</EuiBadge>,
      titleLineClamp: CARD_TITLE_LINE_CLAMP,
      descriptionLineClamp: CARD_DESCRIPTION_LINE_CLAMP,
      maxCardHeight: MAX_CARD_HEIGHT_IN_PX,
      description: DESCRIPTION,
      icons: [{ src: AssistantIconSVG, type: 'svg' }],
      url: getAppUrl(navigation),
      onCardClick: () => {
        reportLinkClick?.(`${TELEMETRY_INTEGRATION_CARD}_${ID}`);
        navigateTo(navigation);
      },
      categories: [],
      integration: '',
      version: '0.0.0',
    };
  }, [getAppUrl, navigateTo, reportLinkClick]);
};
