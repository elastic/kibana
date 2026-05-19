import type { IRouter, CustomRequestHandlerContext } from '@kbn/core/server';
import type { AlertingApiRequestHandlerContext } from '@kbn/alerting-plugin/server';
import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';
import type { ActionsApiRequestHandlerContext } from '@kbn/actions-plugin/server';
/**
 * @internal
 */
export type UptimeRequestHandlerContext = CustomRequestHandlerContext<{
    licensing: LicensingApiRequestHandlerContext;
    alerting: AlertingApiRequestHandlerContext;
    actions: ActionsApiRequestHandlerContext;
}>;
/**
 * @internal
 */
export type UptimeRouter = IRouter<UptimeRequestHandlerContext>;
