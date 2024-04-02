/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESTestIndexTool, ES_TEST_INDEX_NAME } from '@kbn/alerting-api-integration-helpers';
import { STACK_AAD_INDEX_NAME } from '@kbn/stack-alerts-plugin/server/rule_types';
import { FtrProviderContext } from '../../../../../../common/ftr_provider_context';
import { Spaces } from '../../../../../scenarios';
import { getUrlPrefix, ObjectRemover } from '../../../../../../common/lib';
import { createEsDocuments, createEsDocumentsWithGroups } from '../../../create_test_data';

export const RULE_TYPE_ID = '.es-query';
export const CONNECTOR_TYPE_ID = '.index';
export const ES_TEST_INDEX_SOURCE = 'builtin-rule:es-query';
export const ES_TEST_INDEX_REFERENCE = '-na-';
export const ES_TEST_OUTPUT_INDEX_NAME = `${ES_TEST_INDEX_NAME}-output`;
export const ES_TEST_DATA_STREAM_NAME = 'test-data-stream';

export const RULE_INTERVALS_TO_WRITE = 5;
export const RULE_INTERVAL_SECONDS = 4;
export const RULE_INTERVAL_MILLIS = RULE_INTERVAL_SECONDS * 1000;
export const ES_GROUPS_TO_WRITE = 3;

export interface SourceField {
  label: string;
  searchPath: string;
}

export async function createConnector(
  supertest: any,
  objectRemover: ObjectRemover,
  index: string
): Promise<string> {
  const { body: createdConnector } = await supertest
    .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
    .set('kbn-xsrf', 'foo')
    .send({
      name: 'index action for es query FT',
      connector_type_id: CONNECTOR_TYPE_ID,
      config: {
        index,
      },
      secrets: {},
    })
    .expect(200);

  const connectorId = createdConnector.id;
  objectRemover.add(Spaces.space1.id, connectorId, 'connector', 'actions');

  return connectorId;
}

export interface CreateRuleParams {
  name: string;
  size: number;
  thresholdComparator: string;
  threshold: number[];
  timeWindowSize?: number;
  esQuery?: string;
  timeField?: string;
  searchConfiguration?: unknown;
  searchType?: 'searchSource';
  notifyWhen?: string;
  indexName?: string;
  aggType?: string;
  groupBy?: string;
}

export function getRuleServices(getService: FtrProviderContext['getService']) {
  const retry = getService('retry');
  const es = getService('es');
  const esTestIndexTool = new ESTestIndexTool(es, retry);
  const esTestIndexToolOutput = new ESTestIndexTool(es, retry, ES_TEST_OUTPUT_INDEX_NAME);
  const esTestIndexToolDataStream = new ESTestIndexTool(es, retry, ES_TEST_DATA_STREAM_NAME);
  const esTestIndexToolAAD = new ESTestIndexTool(
    es,
    retry,
    `.internal.alerts-${STACK_AAD_INDEX_NAME}.alerts-default-000001`
  );

  async function createEsDocumentsInGroups(
    groups: number,
    endDate: string,
    indexTool: ESTestIndexTool = esTestIndexTool,
    indexName: string = ES_TEST_INDEX_NAME
  ) {
    await createEsDocuments(
      es,
      indexTool,
      endDate,
      RULE_INTERVALS_TO_WRITE,
      RULE_INTERVAL_MILLIS,
      groups,
      indexName
    );
  }

  async function createGroupedEsDocumentsInGroups(
    groups: number,
    endDate: string,
    indexTool: ESTestIndexTool = esTestIndexTool,
    indexName: string = ES_TEST_INDEX_NAME
  ) {
    await createEsDocumentsWithGroups({
      es,
      esTestIndexTool: indexTool,
      endDate,
      intervals: RULE_INTERVALS_TO_WRITE,
      intervalMillis: RULE_INTERVAL_MILLIS,
      groups,
      indexName,
    });
  }

  async function waitForDocs(count: number): Promise<any[]> {
    return await esTestIndexToolOutput.waitForDocs(
      ES_TEST_INDEX_SOURCE,
      ES_TEST_INDEX_REFERENCE,
      count
    );
  }

  async function getAllAADDocs(size: number): Promise<any> {
    return await esTestIndexToolAAD.getAll(size);
  }

  async function removeAllAADDocs(): Promise<any> {
    return await esTestIndexToolAAD.removeAll();
  }

  return {
    retry,
    es,
    esTestIndexTool,
    esTestIndexToolOutput,
    esTestIndexToolDataStream,
    createEsDocumentsInGroups,
    createGroupedEsDocumentsInGroups,
    waitForDocs,
    getAllAADDocs,
    removeAllAADDocs,
  };
}
