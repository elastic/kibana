/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { AxiosError } from 'axios';
import pRetry from 'p-retry';
import type {
  ProductType,
  Project,
  CreateProjectRequestBody,
  Credentials,
} from './project_handler';
import { ProjectHandler } from './project_handler';

const DEFAULT_REGION = 'aws-eu-west-1';

export class CloudHandler extends ProjectHandler {
  apiKey: string;

  constructor(apiKey: string, baseEnvUrl: string) {
    super(baseEnvUrl);
    this.apiKey = apiKey;
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
    const override = commit && commit !== '' ? commit : process.env.KIBANA_MKI_IMAGE_COMMIT;
    if (override && !qualityGate) {
      const kibanaOverrideImage = `${override?.substring(0, 12)}`;
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
      const response = await axios.post(
        `${this.baseEnvUrl}/api/v1/serverless/projects/security`,
        body,
        {
          headers: {
            Authorization: `ApiKey ${this.apiKey}`,
          },
        }
      );
      return {
        name: response.data.name,
        id: response.data.id,
        region: response.data.region_id,
        es_url: `${response.data.endpoints.elasticsearch}:443`,
        kb_url: `${response.data.endpoints.kibana}:443`,
        product: response.data.type,
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        const errorData = JSON.stringify(error.response?.data);
        this.log.error(`${error.response?.status}:${errorData}`);
      } else {
        this.log.error(`${error.message}`);
      }
    }
  }

  // Method to invoke the delete project API for serverless.
  async deleteSecurityProject(projectId: string, projectName: string): Promise<void> {
    try {
      await axios.delete(`${this.baseEnvUrl}/api/v1/serverless/projects/security/${projectId}`, {
        headers: {
          Authorization: `ApiKey ${this.apiKey}`,
        },
      });
      this.log.info(`Project ${projectName} was successfully deleted!`);
    } catch (error) {
      if (error instanceof AxiosError) {
        this.log.error(`${error.response?.status}:${error.response?.data}`);
      } else {
        this.log.error(`${error.message}`);
      }
    }
  }

  // Method to reset the credentials for the created project.
  resetCredentials(projectId: string): Promise<Credentials | undefined> {
    this.log.info(`${projectId} : Reseting credentials`);

    const fetchResetCredentialsStatusAttempt = async (attemptNum: number) => {
      const response = await axios.post(
        `${this.baseEnvUrl}/api/v1/serverless/projects/security/${projectId}/_reset-internal-credentials`,
        {},
        {
          headers: {
            Authorization: `ApiKey ${this.apiKey}`,
          },
        }
      );
      this.log.info('Credentials have been reset');
      return {
        password: response.data.password,
        username: response.data.username,
      };
    };

    const retryOptions = {
      onFailedAttempt: (error: Error | AxiosError) => {
        if (error instanceof AxiosError && error.code === 'ENOTFOUND') {
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
      const response = await axios.get(
        `${this.baseEnvUrl}/api/v1/serverless/projects/security/${projectId}/status`,
        {
          headers: {
            Authorization: `ApiKey ${this.apiKey}`,
          },
        }
      );
      if (response.data.phase !== 'initialized') {
        this.log.info(response.data);
        throw new Error('Project is not initialized. A retry will be triggered soon...');
      } else {
        this.log.info('Project is initialized');
      }
    };
    const retryOptions = {
      onFailedAttempt: (error: Error | AxiosError) => {
        if (error instanceof AxiosError && error.code === 'ENOTFOUND') {
          this.log.info('Project is not reachable. A retry will be triggered soon...');
        } else {
          this.log.error(`${error.message}`);
        }
      },
      retries: 100,
      factor: 2,
      maxTimeout: 20000,
    };
    return pRetry(fetchProjectStatusAttempt, retryOptions);
  }
}
