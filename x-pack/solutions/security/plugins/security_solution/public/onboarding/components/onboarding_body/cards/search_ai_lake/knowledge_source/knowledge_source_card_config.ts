/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { KnowledgeSourceCardItemId } from './types';
import type { CardSelectorAssetListItem } from '../../types';
import { CardAssetType } from '../../types';

export const KNOWLEDGE_SOURCE_CARD_ITEMS: CardSelectorAssetListItem[] = [
  {
    id: KnowledgeSourceCardItemId.install,
    title: i18n.translate('xpack.securitySolution.onboarding.knowledgeSourceCards.install.title', {
      defaultMessage: 'Install knowledge source',
    }),
    description: i18n.translate(
      'xpack.securitySolution.onboarding.knowledgeSourceCards.install.description',
      {
        defaultMessage: 'Quickly add and enable the knowledge source you need',
      }
    ),
    // FIXME: update the video
    asset: {
      type: CardAssetType.video,
      source: 'https://ela.st/ai4dsoc-gs1',
      alt: i18n.translate(
        'xpack.securitySolution.onboarding.knowledgeSourceCards.install.description',
        {
          defaultMessage: 'Quickly add and enable the knowledge source you need',
        }
      ),
    },
  },
  {
    id: KnowledgeSourceCardItemId.create,
    title: i18n.translate('xpack.securitySolution.onboarding.knowledgeSourceCards.create.title', {
      defaultMessage: 'Create a custom knowledge source',
    }),
    description: i18n.translate(
      'xpack.securitySolution.onboarding.knowledgeSourceCards.create.description',
      {
        defaultMessage: 'Create a custom knowledge source',
      }
    ),
    asset: {
      type: CardAssetType.video,
      source: 'http://ela.st/ai4dsoc-gs2',
      alt: i18n.translate(
        'xpack.securitySolution.onboarding.knowledgeSourceCards.create.description',
        {
          defaultMessage: 'Create a custom knowledge source',
        }
      ),
    },
  },
];

export const KNOWLEDGE_SOURCE_CARD_ITEMS_BY_ID = Object.fromEntries(
  KNOWLEDGE_SOURCE_CARD_ITEMS.map((card) => [card.id, card])
);
