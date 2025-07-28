/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import {
  ALERT_END,
  ALERT_GROUP,
  ALERT_INSTANCE_ID,
  ALERT_RULE_TAGS,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_UUID,
} from '@kbn/rule-data-utils';
import dedent from 'dedent';
import moment from 'moment';
import { ObservabilityFields } from '../../../../../common/utils/alerting/types';
import { TopAlert } from '../../../../typings/alerts';

interface Props {
  alert: TopAlert<ObservabilityFields>;
  filterProximal: boolean;
}

export function getBuildRelatedAlertsQuery({
  alert,
  filterProximal,
}: Props): QueryDslQueryContainer {
  const groups = alert.fields[ALERT_GROUP];
  const shouldGroups: QueryDslQueryContainer[] = [];
  groups?.forEach(({ field, value }) => {
    if (!field || !value) return;
    shouldGroups.push({
      bool: {
        boost: 2.0,
        must: [
          { term: { 'kibana.alert.group.field': field } },
          { term: { 'kibana.alert.group.value': value } },
        ],
      },
    });
  });

  const shouldRule = alert.fields[ALERT_RULE_UUID]
    ? [
        {
          term: {
            'kibana.alert.rule.uuid': {
              value: alert.fields[ALERT_RULE_UUID],
              boost: 1.0,
            },
          },
        },
      ]
    : [];
  const startDate = moment(alert.fields[ALERT_START]);
  const endDate = alert.fields[ALERT_END] ? moment(alert.fields[ALERT_END]) : undefined;
  const tags = alert.fields[ALERT_RULE_TAGS] ?? [];
  const instanceId = alert.fields[ALERT_INSTANCE_ID]?.split(',') ?? [];

  const range = filterProximal ? [30, 'minutes'] : [1, 'days'];

  return {
    bool: {
      filter: [
        {
          range: {
            [ALERT_START]: {
              gte: startDate
                .clone()
                .subtract(...range)
                .toISOString(),
              lte: startDate
                .clone()
                .add(...range)
                .toISOString(),
            },
          },
        },
      ],
      must_not: [
        {
          term: {
            [ALERT_UUID]: {
              value: alert.fields[ALERT_UUID],
            },
          },
        },
      ],
      should: [
        ...shouldGroups,
        ...shouldRule,
        {
          term: {
            [ALERT_STATUS]: {
              value: alert.fields[ALERT_STATUS],
              boost: 2,
            },
          },
        },
        {
          function_score: {
            functions: [
              {
                exp: {
                  [ALERT_START]: {
                    origin: startDate.toISOString(),
                    scale: '10m',
                    offset: '10m',
                    decay: 0.5,
                  },
                },
                weight: 10,
              },
              ...(endDate
                ? [
                    {
                      exp: {
                        [ALERT_END]: {
                          origin: endDate.toISOString(),
                          scale: '10m',
                          offset: '10m',
                          decay: 0.5,
                        },
                      },
                      weight: 10,
                    },
                  ]
                : []),
              {
                script_score: {
                  script: {
                    source: dedent(`
                      double jaccardSimilarity(Set a, Set b) {
                        if (a.size() == 0 || b.size() == 0) return 0.0;
                        Set intersection = new HashSet(a);
                        intersection.retainAll(b);
                        Set union = new HashSet(a);
                        union.addAll(b);
                        return (double) intersection.size() / union.size();
                      }
                      Set tagsQuery = new HashSet(params.tags);
                      Set tagsDoc = new HashSet(doc.containsKey("kibana.alert.rule.tags") && !doc.get("kibana.alert.rule.tags").empty ? doc.get("kibana.alert.rule.tags") : []);
                      return 1.0 + jaccardSimilarity(tagsQuery, tagsDoc);
                    `),
                    params: {
                      tags,
                    },
                  },
                },
                weight: 2,
              },
              {
                script_score: {
                  script: {
                    source: dedent(`
                      double jaccardSimilarity(Set a, Set b) {
                        if (a.size() == 0 || b.size() == 0) return 0.0;
                        Set intersection = new HashSet(a);
                        intersection.retainAll(b);
                        Set union = new HashSet(a);
                        union.addAll(b);
                        return (double) intersection.size() / union.size();
                      }
                      Set instanceIdQuery = new HashSet(params.instanceId);
                      Set instanceIdDoc = new HashSet();
                      if (doc.containsKey('kibana.alert.instance.id')) {
                        String instanceIdStr = doc['kibana.alert.instance.id'].value;
                        if (instanceIdStr != null && !instanceIdStr.isEmpty()) {
                          StringTokenizer tokenizer = new StringTokenizer(instanceIdStr, ',');
                          while (tokenizer.hasMoreTokens()) {
                            instanceIdDoc.add(tokenizer.nextToken());
                          }
                        }
                      }

                      return 1.0 + jaccardSimilarity(instanceIdQuery, instanceIdDoc);
                    `),
                    params: {
                      instanceId,
                    },
                  },
                },
                weight: 5,
              },
            ],
            score_mode: 'multiply',
            boost_mode: 'sum',
          },
        },
      ],
    },
  };
}
