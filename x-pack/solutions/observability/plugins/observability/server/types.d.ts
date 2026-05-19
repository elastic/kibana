import * as rt from 'io-ts';
import type { IRouter, CustomRequestHandlerContext, CoreRequestHandlerContext } from '@kbn/core/server';
import type { AlertingApiRequestHandlerContext } from '@kbn/alerting-plugin/server';
import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';
export type { ObservabilityRouteCreateOptions, ObservabilityRouteHandlerResources, AbstractObservabilityServerRouteRepository, ObservabilityServerRouteRepository, APIEndpoint, ObservabilityAPIReturnType, } from './routes/types';
/**
 * @internal
 */
export type ObservabilityRequestHandlerContext = CustomRequestHandlerContext<{
    licensing: LicensingApiRequestHandlerContext;
    alerting: AlertingApiRequestHandlerContext;
    core: Promise<CoreRequestHandlerContext>;
}>;
/**
 * @internal
 */
export type ObservabilityPluginRouter = IRouter<ObservabilityRequestHandlerContext>;
export declare const metricsExplorerViewSavedObjectAttributesRT: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
    name: rt.BrandC<rt.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>;
}>>, rt.UnknownRecordC]>;
export declare const metricsExplorerViewSavedObjectRT: rt.IntersectionC<[rt.TypeC<{
    id: rt.StringC;
    attributes: rt.IntersectionC<[rt.ExactC<rt.TypeC<{
        name: rt.BrandC<rt.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>;
    }>>, rt.UnknownRecordC]>;
}>, rt.PartialC<{
    version: rt.StringC;
    updated_at: rt.Type<number, string, unknown>;
}>]>;
