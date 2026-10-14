/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { IconType } from '@elastic/eui';
import { hasSameEsql } from '@kbn/streams-schema';
import type { CreateSourceRequest, NightshiftSource } from '@kbn/nightshift-shared';

/** A source the Sources tab offers to create in one click. */
export interface RecommendedSource {
  readonly id: string;
  readonly iconType: IconType;
  readonly title: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly esql: string;
}

export const ALL_LOGS_RECOMMENDED_SOURCE: RecommendedSource = {
  id: 'all-logs',
  iconType: 'logsApp',
  title: i18n.translate('xpack.significantEventsApp.sources.recommended.allLogs.title', {
    defaultMessage: 'All logs',
  }),
  description: i18n.translate(
    'xpack.significantEventsApp.sources.recommended.allLogs.description',
    {
      defaultMessage:
        'Every log in this space. Nightshift learns what normal looks like and watches for significant events across all of them.',
    }
  ),
  tags: ['logs', 'recommended'],
  esql: 'FROM logs*',
};

export const RECOMMENDED_SOURCES: readonly RecommendedSource[] = [ALL_LOGS_RECOMMENDED_SOURCE];

/** Presets whose query is not already used by a source in the space. */
export const getAvailableRecommendedSources = (
  sources: readonly NightshiftSource[],
  presets: readonly RecommendedSource[] = RECOMMENDED_SOURCES
): RecommendedSource[] =>
  presets.filter(({ esql }) => !sources.some((source) => hasSameEsql(source.esql, esql)));

export const toCreateSourceRequest = ({
  title,
  description,
  tags,
  esql,
}: RecommendedSource): CreateSourceRequest => ({ title, description, tags: [...tags], esql });
