/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList, EuiText } from '@elastic/eui';
import type { EuiDescriptionListProps } from '@elastic/eui';
import {
  type RuleDataSource,
  type RuleEqlQuery,
} from '../../../../../../../../../common/api/detection_engine';
import * as descriptionStepI18n from '../../../../../../../rule_creation_ui/components/description_step/translations';
import { Query, Filters } from '../../../../rule_definition_section';
import { getDataSourceProps, isFilters } from '../../../../helpers';

interface EqlQueryReadOnlyProps {
  eqlQuery: RuleEqlQuery;
  dataSource?: RuleDataSource;
}

export function EqlQueryReadOnly({ eqlQuery, dataSource }: EqlQueryReadOnlyProps) {
  const listItems: EuiDescriptionListProps['listItems'] = [
    {
      title: descriptionStepI18n.EQL_QUERY_LABEL,
      description: <Query query={eqlQuery.query} />,
    },
  ];

  if (isFilters(eqlQuery.filters) && eqlQuery.filters.length > 0) {
    const dataSourceProps = getDataSourceProps(dataSource);

    listItems.push({
      title: descriptionStepI18n.FILTERS_LABEL,
      description: <Filters filters={eqlQuery.filters} {...dataSourceProps} />,
    });
  }

  if (eqlQuery.event_category_override) {
    listItems.push({
      title: descriptionStepI18n.EQL_EVENT_CATEGORY_FIELD_LABEL,
      description: <EuiText size="s">{eqlQuery.event_category_override}</EuiText>,
    });
  }

  if (eqlQuery.tiebreaker_field) {
    listItems.push({
      title: descriptionStepI18n.EQL_TIEBREAKER_FIELD_LABEL,
      description: <EuiText size="s">{eqlQuery.tiebreaker_field}</EuiText>,
    });
  }

  if (eqlQuery.timestamp_field) {
    listItems.push({
      title: descriptionStepI18n.EQL_TIMESTAMP_FIELD_LABEL,
      description: <EuiText size="s">{eqlQuery.timestamp_field}</EuiText>,
    });
  }

  return <EuiDescriptionList listItems={listItems} />;
}
