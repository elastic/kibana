import type { ChromeBreadcrumb } from '@kbn/core/public';
import type { ChromeBreadcrumbsAppendExtension } from '@kbn/core-chrome-browser';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
/**
 *
 * By default the breadcrumbs will be passed to either serverless.setBreadcrumbs or chrome.setBreadcrumbs depending on the
 * environment. The breadcrumbs will *also* be passed to the project style breadcrumbs for stateful project style. We will use "project style"
 * here to refer to serverless chrome and stateful project style chrome. Classic refers to stateful classic chrome.
 *
 * Project style breadcrumbs add a root crumb ("deployment" etc) and "nav crumbs" which are derived from the navigation structure. By default
 * the "absolute" mode is used which means the breadcrumbs passed here will omit the navigation derived "nav crumbs". You can pass
 * absoluteProjectStyleBreadcrumbs: false to include the 'smart' "nav crumbs".
 *
 * In classic mode (not project style) the 'Observability' crumb is added.
 *
 * You can also pass classicOnly to only set breadrumbs in the classic chrome context. This can be useful if your solution just wants to defer all project style crumbs to the "nav crumbs".
 */
export declare const useBreadcrumbs: (extraCrumbs: ChromeBreadcrumb[], options?: {
    app?: {
        id: string;
        label: string;
    };
    breadcrumbsAppendExtension?: ChromeBreadcrumbsAppendExtension;
    serverless?: ServerlessPluginStart;
    absoluteProjectStyleBreadcrumbs?: boolean;
    classicOnly?: boolean;
}) => void;
