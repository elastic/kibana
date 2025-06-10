/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeepPartial } from 'utility-types';
import { merge } from 'lodash';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { buildIndexNameWithNamespace } from '../utils/index_name_utilities';
import { MICROSOFT_DEFENDER_ENDPOINT_LOG_INDEX_PATTERN } from '../service/response_actions/microsoft_defender';
import { BaseDataGenerator } from './base_data_generator';
import type { MicrosoftDefenderEndpointLogEsDoc } from '../types';

export class MicrosoftDefenderDataGenerator extends BaseDataGenerator {
  /**
   * Generates a MS Defender endpoint log as ingested by the Microsoft Defender for Endpoint
   * integration into the `logs-microsoft_defender_endpoint.log` index.
   * If adding this generated document to ES, make sure that the integration has been installed.
   */
  generateEndpointLog(
    overrides: DeepPartial<MicrosoftDefenderEndpointLogEsDoc> = {}
  ): MicrosoftDefenderEndpointLogEsDoc {
    const now = new Date().toISOString();

    return merge(
      {
        agent: {
          name: 'ptavares-agentless-integrations-default-8511',
          id: 'a572fc2e-0276-494a-b693-6e907bc2a78b',
          ephemeral_id: 'e7d70430-d25e-4d72-863e-918ac36bbbf7',
          type: 'filebeat',
          version: '9.0.0',
        },
        process: {
          parent: {
            start: now,
            pid: 9901,
          },
          start: now,
          pid: 10083,
          command_line: '-bash',
        },
        elastic_agent: {
          id: 'a572fc2e-0276-494a-b693-6e907bc2a78b',
          version: '9.0.0',
          snapshot: true,
        },
        rule: {
          description:
            'Remote file transfer activity was observed on this device. Attackers might be attempting to steal data from the device or move laterally on the network.',
        },
        message: 'Remote exfiltration activity',
        microsoft: {
          defender_endpoint: {
            evidence: {
              accountName: 'ubuntu',
              detectionStatus: 'Detected',
              parentProcessFileName: 'bash',
              entityType: 'Process',
              evidenceCreationTime: now,
              domainName: 'discerning-spaniel',
            },
            mitreTechniques: [
              'T1005',
              'T1020',
              'T1041',
              'T1048',
              'T1071',
              'T1071.001',
              'T1204.001',
              'T1567',
              'T1570',
            ],
            detectorId: this.seededUUIDv4(),
            investigationState: 'UnsupportedOs',
            incidentId: '4',
            lastUpdateTime: now,
            status: 'New',
          },
        },
        tags: ['microsoft-defender-endpoint', 'forwarded'],
        cloud: {
          instance: {
            id: '7bcf55e03728756dbf02ba7979a0c6218321ade7',
          },
          provider: 'azure',
          account: {
            id: 'c38d90f4-369c-4815-ab69-4663a1f5c115',
          },
        },
        input: {
          type: 'httpjson',
        },
        observer: {
          product: 'Defender for Endpoint',
          vendor: 'Microsoft',
          name: 'WindowsDefenderAtp',
        },
        '@timestamp': now,
        file: {
          path: '/usr/bin/',
          name: 'bash',
          hash: {
            sha1: 'ce4fbd66c02e235bbc8dfa4a512c51414d8e0e67',
            sha256: 'c5f8a98c674631609902846fae6df219b3b16d97db58cf1c1334f8eb14962bde',
          },
        },
        ecs: {
          version: '8.11.0',
        },
        related: {
          hosts: ['discerning-spaniel'],
          hash: [
            'ce4fbd66c02e235bbc8dfa4a512c51414d8e0e67',
            'c5f8a98c674631609902846fae6df219b3b16d97db58cf1c1334f8eb14962bde',
          ],
        },
        data_stream: {
          namespace: 'default',
          type: 'logs',
          dataset: 'microsoft_defender_endpoint.log',
        },
        host: {
          hostname: 'discerning-spaniel',
          name: 'discerning-spaniel',
        },
        threat: {
          framework: 'MITRE ATT&CK',
          technique: {
            name: ['Exfiltration'],
          },
        },
        event: {
          severity: 3,
          created: now,
          kind: 'alert',
          timezone: 'UTC',
          start: now,
          type: ['start'],
          duration: 5253721000,
          agent_id_status: 'verified',
          ingested: now,
          provider: 'defender_endpoint',
          action: 'Exfiltration',
          end: now,
          id: this.seededUUIDv4(),
          category: ['host', 'process'],
          dataset: 'microsoft_defender_endpoint.log',
        },
      },
      overrides
    );
  }

  generateEndpointLogEsHit(
    overrides: DeepPartial<MicrosoftDefenderEndpointLogEsDoc> = {}
  ): SearchHit<MicrosoftDefenderEndpointLogEsDoc> {
    return this.toEsSearchHit(
      this.generateEndpointLog(overrides),
      buildIndexNameWithNamespace(MICROSOFT_DEFENDER_ENDPOINT_LOG_INDEX_PATTERN, 'default')
    );
  }

  generateEndpointLogEsSearchResponse(
    docs: Array<SearchHit<MicrosoftDefenderEndpointLogEsDoc>> = [this.generateEndpointLogEsHit()]
  ) {
    return this.toEsSearchResponse(docs);
  }
}
