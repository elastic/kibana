/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import unified from 'unified';
import markdown from 'remark-parse-no-trim';
import { filter, reduce } from 'lodash';

import type { ECSMapping } from '@kbn/osquery-io-ts-types';
import type { RuleResponseAction } from '../../../common/api/detection_engine/model/rule_response_actions';
import { ResponseActionTypesEnum } from '../../../common/api/detection_engine/model/rule_response_actions';
import { OsqueryParser } from '../../common/components/markdown_editor/plugins/osquery/parser';

interface OsqueryNoteQuery {
  configuration: {
    label: string;
    query: string;
    ecs_mapping: ECSMapping;
  };
}

export const getOsqueryQueriesFromNote = (note: string): OsqueryNoteQuery[] => {
  const parsedAlertInvestigationGuide = unified()
    .use([[markdown, {}], OsqueryParser])
    .parse(note);
  return filter(parsedAlertInvestigationGuide?.children as object, ['type', 'osquery']);
};

export const getResponseActionsFromNote = (
  osqueryQueries: OsqueryNoteQuery[],
  defaultResponseActions: RuleResponseAction[] = []
) => {
  return reduce(
    osqueryQueries,
    (acc: { responseActions: RuleResponseAction[] }, { configuration }: OsqueryNoteQuery) => {
      const responseActionPath = 'responseActions';
      acc[responseActionPath].push({
        actionTypeId: ResponseActionTypesEnum['.osquery'],
        params: {
          savedQueryId: undefined,
          packId: undefined,
          queries: undefined,
          query: configuration.query,
          ecsMapping: configuration.ecs_mapping,
        },
      });

      return acc;
    },
    { responseActions: defaultResponseActions }
  );
};
