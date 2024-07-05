/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import Path from 'path';

import { REPO_ROOT as KIBANA_ROOT } from '@kbn/repo-info';
import { FtrProviderContext } from '../configs/ftr_provider_context';

const TELEMETRY_API_ROOT = '/api/stats?extended=true';
const TELEMETRY_DATA_ROOT = Path.join(
  KIBANA_ROOT,
  'x-pack/test/functional/es_archives/endpoint/telemetry/'
);

interface EndpointTelemetry {
  total_installed: number;
  active_within_last_24_hours: number;
  os: Array<{
    full_name: string;
    platform: string;
    version: string;
    count: number;
  }>;
  policies: {
    malware: {
      active: number;
      inactive: number;
      failure: number;
    };
  };
}

export function EndpointTelemetryTestResourcesProvider({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  return {
    /**
     * Return the endpoint telemetry object from /api/stats?extended=true
     */
    async getEndpointTelemetry(): Promise<EndpointTelemetry> {
      const kibanaTelemetry = await supertest.get(TELEMETRY_API_ROOT);
      return kibanaTelemetry.body.usage.security_solution.endpoints;
    },
    /**
     * Create an telemetry archive from a source archive with updated last_checkin field to test
     * active_within_last_24_hours
     */
    async getArchiveSetCheckIn(
      sourceArchive: string,
      destinationArchive: string,
      checkInOffset: number = 0
    ) {
      const sourcePath = Path.join(TELEMETRY_DATA_ROOT, sourceArchive);
      const destinationPath = Path.join(TELEMETRY_DATA_ROOT, destinationArchive);

      if (fs.existsSync(destinationPath)) {
        this.deleteArchive(destinationArchive);
      }
      fs.mkdirSync(destinationPath);

      fs.readdirSync(sourcePath).forEach((file) => {
        const sourceFilePath = Path.join(sourcePath, file);
        const destinationFilePath = Path.join(destinationPath, file);
        fs.copyFileSync(sourceFilePath, destinationFilePath);
      });

      fs.readdirSync(destinationPath).forEach((file) => {
        if (file !== 'mappings.json') {
          const dataFilePath = Path.join(destinationPath, file);
          const rawDocuments = fs.readFileSync(dataFilePath).toString().split('\n\n');

          const dateTime = new Date();
          dateTime.setDate(dateTime.getDate() - checkInOffset);
          rawDocuments.forEach((rawDocument, index) => {
            const document = JSON.parse(rawDocument);
            if (document.value.source.type === 'fleet-agents') {
              document.value.source['fleet-agents'].last_checkin = dateTime.toISOString();
              rawDocuments[index] = JSON.stringify(document);
            }
          });

          fs.writeFileSync(dataFilePath, rawDocuments.join('\n\n'));
        }
      });
    },
    /**
     * Delete archives created for testing
     */
    async deleteArchive(archiveName: string) {
      const archivePath = Path.join(TELEMETRY_DATA_ROOT, archiveName);
      if (fs.existsSync(archivePath)) {
        fs.readdirSync(archivePath).forEach((file) => {
          const archiveFile = Path.join(archivePath, file);
          fs.unlinkSync(archiveFile);
        });
      }
      fs.rmdirSync(archivePath);
    },
  };
}
