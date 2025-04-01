/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DiffableRule } from '../../../../../../../../../common/api/detection_engine';
import {
  InlineKqlQuery,
  KqlQueryLanguage,
  KqlQueryType,
  RuleQuery,
} from '../../../../../../../../../common/api/detection_engine';
import type { FormData } from '../../../../../../../../shared_imports';
import type { FieldValueQueryBar } from '../../../../../../../rule_creation_ui/components/query_bar_field';
import { RuleFieldEditFormWrapper } from '../../../field_final_side';
import { ThreatMatchQueryEditAdapter } from './threat_match_query_edit_adapter';
import { isFilters } from '../../../../helpers';

export function ThreatMatchQueryEditForm(): JSX.Element {
  return (
    <RuleFieldEditFormWrapper
      component={ThreatMatchQueryEditAdapter}
      ruleFieldFormSchema={schema}
      deserializer={deserializer}
      serializer={serializer}
    />
  );
}

const schema = {};

function deserializer(
  _: FormData,
  finalDiffableRule: DiffableRule
): {
  threatQuery: FieldValueQueryBar;
} {
  const parsedQuery = InlineKqlQuery.parse(
    (finalDiffableRule as { threat_query: InlineKqlQuery }).threat_query
  );

  return {
    threatQuery: {
      query: {
        query: parsedQuery.query,
        language: parsedQuery.language,
      },
      filters: isFilters(parsedQuery.filters) ? parsedQuery.filters : [],
      saved_id: null,
    },
  };
}

function serializer(formData: FormData): {
  threat_query: InlineKqlQuery;
} {
  const threatQuery = (formData as { threatQuery: FieldValueQueryBar }).threatQuery;

  const query = RuleQuery.parse(threatQuery.query.query);
  const language = KqlQueryLanguage.parse(threatQuery.query.language);

  return {
    threat_query: {
      type: KqlQueryType.inline_query,
      query,
      language,
      filters: threatQuery.filters,
    },
  };
}
