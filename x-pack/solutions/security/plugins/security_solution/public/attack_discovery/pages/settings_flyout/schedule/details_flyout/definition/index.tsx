/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiDescriptionListProps } from '@elastic/eui';
import { EuiDescriptionList, EuiSpacer, EuiTitle } from '@elastic/eui';
import { formatDuration } from '@kbn/alerting-plugin/common';
import type { Filter } from '@kbn/es-query';
import type { AttackDiscoverySchedule } from '@kbn/elastic-assistant-common';

import * as i18n from './translations';
import { Filters } from './filters';
import { CommonField } from './common_field';

const DEFAULT_DESCRIPTION_LIST_COLUMN_WIDTHS: [string, string] = ['30%', '70%'];

interface Props {
  schedule: AttackDiscoverySchedule;
}

export function getQueryLanguageLabel(language: string) {
  switch (language) {
    case 'kuery':
      return i18n.KUERY_LANGUAGE_LABEL;
    case 'lucene':
      return i18n.LUCENE_LANGUAGE_LABEL;
    default:
      return language;
  }
}

export const ScheduleDefinition: React.FC<Props> = React.memo(({ schedule }) => {
  const definitionSectionListItems = useMemo(() => {
    const items: EuiDescriptionListProps['listItems'] = [];

    if (schedule.params.filters?.length) {
      items.push({
        title: <span data-test-subj="filtersTitle">{i18n.FILTERS_LABEL}</span>,
        description: (
          <span data-test-subj="filtersValue">
            <Filters filters={schedule.params.filters as Filter[]} />
          </span>
        ),
      });
    }

    if (schedule.params.query?.query.length) {
      const query = schedule.params.query;
      items.push(
        {
          title: <span data-test-subj="queryTitle">{i18n.QUERY_LABEL}</span>,
          description: (
            <CommonField
              value={typeof query.query === 'string' ? query.query : JSON.stringify(query.query)}
              data-test-subj="queryValue"
            />
          ),
        },
        {
          title: <span data-test-subj="queryLanguageTitle">{i18n.QUERY_LANGUAGE_LABEL}</span>,
          description: (
            <span data-test-subj="queryLanguageValue">{getQueryLanguageLabel(query.language)}</span>
          ),
        }
      );
    }

    items.push({
      title: <span data-test-subj="scheduleIntervalTitle">{i18n.SCHEDULE_INTERVAL_LABEL}</span>,
      description: (
        <CommonField
          value={formatDuration(schedule.schedule.interval, true)}
          data-test-subj="scheduleIntervalValue"
        />
      ),
    });

    items.push({
      title: <span data-test-subj="connectorTitle">{i18n.CONNECTOR_LABEL}</span>,
      description: (
        <CommonField value={schedule.params.apiConfig.name} data-test-subj="connectorValue" />
      ),
    });

    return items;
  }, [schedule]);

  return (
    <>
      <EuiTitle data-test-subj="definitionTitle" size="s">
        <h3>{i18n.DEFINITION_TITLE}</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <div data-test-subj="scheduleDetailsDefinition">
        <EuiDescriptionList
          type={'column'}
          rowGutterSize={'m'}
          listItems={definitionSectionListItems}
          columnWidths={DEFAULT_DESCRIPTION_LIST_COLUMN_WIDTHS}
          data-test-subj="listItemColumnScheduleDescription"
        />
      </div>
    </>
  );
});
ScheduleDefinition.displayName = 'ScheduleDefinition';
