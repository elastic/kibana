/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { SUMMARY_DESTINATION_INDEX_PATTERN } from '../../common/constants';
import { SLODefinition } from '../domain/models';
import { SLORepository } from './slo_repository';
import { EsSummaryDocument } from './summary_transform_generator/helpers/create_temp_summary';
import { fromRemoteSummaryDocumentToSloDefinition } from './unsafe_federated/remote_summary_doc_to_slo';

interface SLODefinitionResult {
  slo: SLODefinition;
  remote?: {
    kibanaUrl: string;
    remoteName: string;
  };
}

export class SloDefinitionClient {
  constructor(
    private repository: SLORepository,
    private esClient: ElasticsearchClient,
    private logger: Logger
  ) {}

  public async execute(
    sloId: string,
    spaceId: string,
    remoteName?: string
  ): Promise<SLODefinitionResult> {
    if (remoteName) {
      const summarySearch = await this.esClient.search<EsSummaryDocument>({
        index: `${remoteName}:${SUMMARY_DESTINATION_INDEX_PATTERN}`,
        query: {
          bool: {
            filter: [{ term: { spaceId } }, { term: { 'slo.id': sloId } }],
          },
        },
      });

      if (summarySearch.hits.hits.length === 0) {
        throw new Error(
          `Remote SLO [id=${sloId}, spaceId=${spaceId}, remoteName=${remoteName}] not found`
        );
      }

      const doc = summarySearch.hits.hits[0]._source!;
      const remoteSloDefinition = fromRemoteSummaryDocumentToSloDefinition(doc, this.logger);
      if (!remoteSloDefinition) {
        throw new Error(
          `Remote SLO [id=${sloId}, spaceId=${spaceId}, remoteName=${remoteName}] is invalid`
        );
      }

      return { slo: remoteSloDefinition, remote: { kibanaUrl: doc.kibanaUrl ?? '', remoteName } };
    }

    const localSloDefinition = await this.repository.findById(sloId);
    return { slo: localSloDefinition };
  }
}
