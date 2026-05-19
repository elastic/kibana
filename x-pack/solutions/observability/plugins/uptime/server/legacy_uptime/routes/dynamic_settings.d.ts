import type { DynamicSettings } from '../../../common/runtime_types';
import type { UMRestApiRouteFactory } from '.';
export declare const createGetDynamicSettingsRoute: UMRestApiRouteFactory<DynamicSettings>;
export declare const validateInteger: (value: number) => string | undefined;
export declare const DynamicSettingsSchema: import("@kbn/config-schema").ObjectType<{
    heartbeatIndices: import("@kbn/config-schema").Type<string | undefined>;
    certAgeThreshold: import("@kbn/config-schema").Type<number | undefined>;
    certExpirationThreshold: import("@kbn/config-schema").Type<number | undefined>;
    defaultConnectors: import("@kbn/config-schema").Type<string[] | undefined>;
    defaultEmail: import("@kbn/config-schema").Type<Readonly<{
        cc?: string[] | undefined;
        bcc?: string[] | undefined;
    } & {
        to: string[];
    }> | undefined>;
}>;
export declare const createPostDynamicSettingsRoute: UMRestApiRouteFactory;
