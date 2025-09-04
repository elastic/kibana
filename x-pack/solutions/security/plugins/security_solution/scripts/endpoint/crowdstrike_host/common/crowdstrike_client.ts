/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { AxiosRequestConfig } from 'axios';
import axios from 'axios';
import pRetry from 'p-retry';
import { createToolingLogger } from '../../../../common/endpoint/data_loaders/utils';
import { catchAxiosErrorFormatAndThrow } from '../../../../common/endpoint/format_axios_error';

interface CrowdStrikeClientOptions {
  /** The base URL for CrowdStrike Falcon API */
  url: string;
  /** The client ID for CrowdStrike OAuth2 */
  clientId: string;
  /** The client secret for CrowdStrike OAuth2 */
  clientSecret: string;
  log?: ToolingLog;
}

interface CrowdStrikeTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface CrowdStrikeSensorInstaller {
  sha256: string;
  name: string;
  platform: string;
  version: string;
  description: string;
  fileType: string;
  releaseDate: string;
}

interface CrowdStrikeSensorInstallersResponse {
  meta: {
    query_time: number;
    powered_by: string;
    trace_id: string;
  };
  resources: CrowdStrikeSensorInstaller[];
}

export class CrowdStrikeClient {
  protected readonly API_TOKEN_PATH = '/oauth2/token';
  protected readonly API_SENSORS_PATH = '/sensors/entities/sensor-installers/v1';
  protected readonly API_SENSOR_DOWNLOAD_PATH = '/sensors/entities/download-installer/v1';
  protected readonly API_HOSTS_PATH = '/devices/entities/devices/v2';

  protected readonly log: ToolingLog;
  private static token: string | null;
  private static tokenExpiryTimeout: NodeJS.Timeout;
  private static base64encodedToken: string;

  constructor(private readonly options: CrowdStrikeClientOptions) {
    this.log = options.log ?? createToolingLogger();

    if (!CrowdStrikeClient.base64encodedToken) {
      CrowdStrikeClient.base64encodedToken = Buffer.from(
        `${this.options.clientId}:${this.options.clientSecret}`
      ).toString('base64');
    }
  }

  private getTokenRequest = async (): Promise<string> => {
    const response = await axios
      .post<CrowdStrikeTokenResponse>(
        this.buildUrl(this.API_TOKEN_PATH),
        new URLSearchParams({
          grant_type: 'client_credentials',
        }),
        {
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            authorization: `Basic ${CrowdStrikeClient.base64encodedToken}`,
          },
        }
      )
      .catch(catchAxiosErrorFormatAndThrow);

    const token = response.data?.access_token;
    if (token) {
      // Set token expiry timeout (tokens are valid for 30 minutes, refresh every 29 minutes)
      if (CrowdStrikeClient.tokenExpiryTimeout) {
        clearTimeout(CrowdStrikeClient.tokenExpiryTimeout);
      }
      CrowdStrikeClient.tokenExpiryTimeout = setTimeout(() => {
        CrowdStrikeClient.token = null;
      }, 29 * 60 * 1000);
    }
    return token;
  };

  private crowdstrikeApiRequest = async <T = unknown>(
    req: AxiosRequestConfig,
    retried?: boolean
  ): Promise<T> => {
    try {
      if (!CrowdStrikeClient.token) {
        CrowdStrikeClient.token = await this.getTokenRequest();
      }

      const apiFullUrl = this.buildUrl(req.url || '');
      const requestOptions: AxiosRequestConfig = {
        ...req,
        url: apiFullUrl,
        headers: {
          ...req.headers,
          Authorization: `Bearer ${CrowdStrikeClient.token}`,
          'Content-Type': 'application/json',
        },
      };

      this.log.debug(`Request: `, requestOptions);

      const response = await pRetry(
        async () => {
          return axios
            .request<T>(requestOptions)
            .then((response) => {
              this.log.verbose(`Response: `, response);
              return response.data;
            })
            .catch(catchAxiosErrorFormatAndThrow);
        },
        { maxTimeout: 10000 }
      );

      return response;
    } catch (error: any) {
      if (error.response?.status === 401 && !retried) {
        CrowdStrikeClient.token = null;
        return this.crowdstrikeApiRequest(req, true);
      }
      throw error;
    }
  };

  public buildUrl(path: string): string {
    const uri = new URL(this.options.url);
    uri.pathname = path;
    return uri.toString();
  }

  /**
   * Get available sensor installers for the specified platform
   */
  public async getSensorInstallers(platform: string): Promise<CrowdStrikeSensorInstaller[]> {
    const response = await this.crowdstrikeApiRequest<CrowdStrikeSensorInstallersResponse>({
      url: this.API_SENSORS_PATH,
      method: 'GET',
      params: {
        filter: `platform:'${platform}'`,
      },
    });

    return response.resources;
  }

  /**
   * Download sensor installer for the specified platform and return the file path
   */
  public async downloadSensorInstaller(platform: string, targetPath: string): Promise<string> {
    this.log.info(`Getting available sensor installers for platform: ${platform}`);

    const installers = await this.getSensorInstallers(platform);
    if (installers.length === 0) {
      throw new Error(`No sensor installers found for platform: ${platform}`);
    }

    // Get the latest installer (assuming they're sorted by release date)
    const latestInstaller = installers[0];
    this.log.info(`Found installer: ${latestInstaller.name} (${latestInstaller.version})`);

    // Download the installer
    const response = await this.crowdstrikeApiRequest<Buffer>({
      url: this.API_SENSOR_DOWNLOAD_PATH,
      method: 'GET',
      params: {
        id: latestInstaller.sha256,
      },
      responseType: 'arraybuffer',
    });

    // Save the file
    const fs = await import('fs/promises');
    const path = await import('path');

    const fileName = latestInstaller.name;
    const filePath = path.join(targetPath, fileName);

    await fs.writeFile(filePath, Buffer.from(response as unknown as ArrayBuffer));

    this.log.info(`Downloaded sensor installer to: ${filePath}`);
    return filePath;
  }

  /**
   * Get host details from CrowdStrike Falcon
   */
  public async getHostDetails(hostId: string): Promise<unknown> {
    return this.crowdstrikeApiRequest({
      url: this.API_HOSTS_PATH,
      method: 'GET',
      params: {
        ids: [hostId],
      },
    });
  }
}
