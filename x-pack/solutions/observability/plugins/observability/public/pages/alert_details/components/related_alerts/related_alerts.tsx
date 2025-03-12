/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import dedent from 'dedent';
import React from 'react';
import { ObservabilityAlertsTable, TopAlert } from '../../../..';
import {
  OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES,
  observabilityAlertFeatureIds,
} from '../../../../../common/constants';
import { ObservabilityFields } from '../../../../../common/utils/alerting/types';

const ALERTS_PER_PAGE = 50;
const ALERTS_TABLE_ID = 'xpack.observability.related.alerts.table';

interface Props {
  alert?: TopAlert<ObservabilityFields>;
}

export function RelatedAlerts({ alert }: Props) {
  if (!alert) {
    return null;
  }

  const esQuery: QueryDslQueryContainer = {
    bool: {
      filter: [
        {
          range: {
            'kibana.alert.start': {
              gte: '2025-03-10T10:08:04.011Z',
              lte: '2025-03-10T18:08:04.011Z',
            },
          },
        },
      ],
      should: [
        {
          bool: {
            boost: 10.0,
            must: [
              {
                term: {
                  'kibana.alert.group.field': 'labels.projectId',
                },
              },
              {
                term: {
                  'kibana.alert.group.value': '115b7cd8-eb86-4176-8afa-adba9da94691',
                },
              },
            ],
          },
        },
        {
          term: {
            'kibana.alert.rule.uuid': {
              value: 'a849eff1-2712-4102-b36c-acc3354cf538',
              boost: 1.0,
            },
          },
        },
        {
          function_score: {
            functions: [
              {
                exp: {
                  'kibana.alert.start': {
                    origin: '2025-03-10T16:08:04.011Z',
                    scale: '10m',
                    offset: '10m',
                    decay: 0.5,
                  },
                },
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
                      Set tagsQuery = new HashSet(params.tags);
                      Set tagsDoc = new HashSet(doc.containsKey('tags.keyword') ? doc['tags.keyword'].values : []);
                      double tagsSimilarity = jaccardSimilarity(tagsQuery, tagsDoc);
                      return tagsSimilarity;
                    `),
                    params: {
                      tags: ['prod', 'test'],
                    },
                  },
                },
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
                      double instanceIdSimilarity = jaccardSimilarity(instanceIdQuery, instanceIdDoc);

                      return instanceIdSimilarity;
                    `),
                    params: {
                      instanceId: ['16e54aa2-a792-48b1-9730-9c3bd9d8895e'],
                    },
                  },
                },
              },
            ],
            boost_mode: 'sum',
          },
        },
      ],
    },
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiSpacer size="xs" />

      <EuiFlexItem>
        <ObservabilityAlertsTable
          id={ALERTS_TABLE_ID}
          ruleTypeIds={OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES}
          consumers={observabilityAlertFeatureIds}
          query={esQuery}
          initialPageSize={ALERTS_PER_PAGE}
          showInspectButton
          onLoaded={(alerts, columns) => console.dir({ alerts, columns })}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
