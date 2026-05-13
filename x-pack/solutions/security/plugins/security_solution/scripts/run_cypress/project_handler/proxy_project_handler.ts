/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry from 'p-retry';
import type {
  ProductType,
  Project,
  CreateProjectRequestBody,
  Credentials,
} from './project_handler';
import { ProjectHandler } from './project_handler';

const DEFAULT_REGION = 'aws-eu-west-1';

export class ProxyHandler extends ProjectHandler {
  proxyAuth: string;

  constructor(baseEnvUrl: string, proxyClientId: string, proxySecret: string) {
    super(baseEnvUrl);
    this.proxyAuth = btoa(`${proxyClientId}:${proxySecret}`);
  }

  // Method to invoke the create project API for serverless.
  async createSecurityProject(
    projectName: string,
    productTypes?: ProductType[],
    commit?: string
  ): Promise<Project | undefined> {
    const body: CreateProjectRequestBody = {
      name: projectName,
      region_id: DEFAULT_REGION,
    };

    if (productTypes) {
      body.product_types = productTypes;
    }

    // The qualityGate variable has been added here to ensure that when the quality gate runs, there will be
    // no kibana image override unless it is running for the daily monitoring.
    // The tests will be executed against the commit which is already promoted to QA.
    const monitoringQualityGate =
      process.env.KIBANA_MKI_QUALITY_GATE_MONITORING &&
      process.env.KIBANA_MKI_QUALITY_GATE_MONITORING === '1';
    const qualityGate =
      process.env.KIBANA_MKI_QUALITY_GATE &&
      process.env.KIBANA_MKI_QUALITY_GATE === '1' &&
      !monitoringQualityGate;

    // KIBANA_DOCKER_IMAGE takes highest priority -- it is a fully qualified image tag.
    const dockerImageOverride = process.env.KIBANA_DOCKER_IMAGE;
    const commitOverride = commit && commit !== '' ? commit : process.env.KIBANA_MKI_IMAGE_COMMIT;

    if (dockerImageOverride && !qualityGate) {
      this.log.info(`Overriding Kibana image with KIBANA_DOCKER_IMAGE: ${dockerImageOverride}`);
      body.overrides = {
        kibana: {
          docker_image: dockerImageOverride,
        },
      };
    } else if (commitOverride && !qualityGate) {
      const kibanaOverrideImage = `${commitOverride?.substring(0, 12)}`;
      this.log.info(`Kibana Image Commit under test: ${process.env.KIBANA_MKI_IMAGE_COMMIT}!`);
      this.log.info(
        `Overriding Kibana image in the MKI with docker.elastic.co/kibana-ci/kibana-serverless:git-${kibanaOverrideImage}`
      );
      body.overrides = {
        kibana: {
          docker_image: `docker.elastic.co/kibana-ci/kibana-serverless:git-${kibanaOverrideImage}`,
        },
      };
    }

    try {
      const response = await fetch(`${this.baseEnvUrl}/projects`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${this.proxyAuth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        throw new Error(`${response.status}:${await response.text()}`);
      }

      const data = (await response.json()) as {
        name: string;
        project_id: string;
        region_id: string;
        elasticsearch_endpoint: string;
        kibana_endpoint: string;
        project_type: string;
        id: number;
        organization_id: number;
        organization_name: string;
      };
      return {
        name: data.name,
        id: data.project_id,
        region: data.region_id,
        es_url: `${data.elasticsearch_endpoint}:443`,
        kb_url: `${data.kibana_endpoint}:443`,
        product: data.project_type,
        proxy_id: data.id,
        proxy_org_id: data.organization_id,
        proxy_org_name: data.organization_name,
      };
    } catch (error) {
      this.log.error(`${error.message}`);
    }
  }

  // Method to invoke the delete project API for serverless.
  async deleteSecurityProject(projectId: string, projectName: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseEnvUrl}/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Basic ${this.proxyAuth}`,
        },
      });
      if (!response.ok) {
        throw new Error(`${response.status}:${await response.text()}`);
      }

      this.log.info(`Project ${projectName} was successfully deleted!`);
    } catch (error) {
      this.log.error(`${error.message}`);
    }
  }

  // Method to reset the credentials for the created project.
  resetCredentials(projectId: string): Promise<Credentials | undefined> {
    this.log.info(`${projectId} : Reseting credentials`);

    const fetchResetCredentialsStatusAttempt = async (attemptNum: number) => {
      const response = await fetch(
        `${this.baseEnvUrl}/projects/${projectId}/_reset-internal-credentials`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${this.proxyAuth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );
      if (!response.ok) {
        throw new Error(`${response.status}:${await response.text()}`);
      }

      const data = (await response.json()) as { password: string; username: string };
      this.log.info('Credentials have been reset');
      return {
        password: data.password,
        username: data.username,
      };
    };

    const retryOptions = {
      onFailedAttempt: (error: Error) => {
        if ((error as { cause?: { code?: string } }).cause?.code === 'ENOTFOUND') {
          this.log.info('Project is not reachable. A retry will be triggered soon..');
        } else {
          this.log.error(`${error.message}`);
        }
      },
      retries: 100,
      factor: 2,
      maxTimeout: 20000,
    };

    return pRetry(fetchResetCredentialsStatusAttempt, retryOptions);
  }

  // Wait until Project is initialized
  waitForProjectInitialized(projectId: string): Promise<void> {
    const fetchProjectStatusAttempt = async (attemptNum: number) => {
      this.log.info(`Retry number ${attemptNum} to check if project is initialized.`);
      const response = await fetch(`${this.baseEnvUrl}/projects/${projectId}/status`, {
        headers: {
          Authorization: `Basic ${this.proxyAuth}`,
        },
      });
      if (!response.ok) {
        throw new Error(`${response.status}:${await response.text()}`);
      }

      const data = (await response.json()) as { phase: string };
      if (data.phase !== 'initialized') {
        this.log.info(data);
        throw new Error('Project is not initialized. A retry will be triggered soon...');
      } else {
        this.log.info('Project is initialized');
      }
    };
    const retryOptions = {
      onFailedAttempt: (error: Error) => {
        if ((error as { cause?: { code?: string } }).cause?.code === 'ENOTFOUND') {
          this.log.info('Project is not reachable. A retry will be triggered soon...');
        } else {
          this.log.warning(`${error.message}`);
        }
      },
      retries: 100,
      factor: 2,
      maxTimeout: 20000,
    };
    return pRetry(fetchProjectStatusAttempt, retryOptions);
  }
}
