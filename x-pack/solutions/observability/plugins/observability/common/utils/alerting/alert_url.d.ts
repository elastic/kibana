import type { IBasePath } from '@kbn/core-http-server';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { AlertsLocatorParams } from '../..';
export declare const getAlertUrl: (alertUuid: string | null, spaceId: string, startedAt: string, alertsLocator?: LocatorPublic<AlertsLocatorParams>, publicBaseUrl?: string) => Promise<string>;
export declare const getAlertDetailsUrl: (basePath: IBasePath, spaceId: string, alertUuid: string | null) => string;
