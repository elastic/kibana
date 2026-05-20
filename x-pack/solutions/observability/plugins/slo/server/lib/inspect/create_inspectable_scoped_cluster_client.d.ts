import type { IScopedClusterClient, IUiSettingsClient, KibanaRequest } from '@kbn/core/server';
export declare function getScopedClusterClientWithInspect({ scopedClusterClient, uiSettingsClient, request, isDev, }: {
    scopedClusterClient: IScopedClusterClient;
    uiSettingsClient: IUiSettingsClient;
    request: KibanaRequest;
    isDev: boolean;
}): Promise<IScopedClusterClient>;
