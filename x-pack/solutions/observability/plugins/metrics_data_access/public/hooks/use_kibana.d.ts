import type { CoreStart } from '@kbn/core/public';
import type { KibanaReactContextValue } from '@kbn/kibana-react-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
export type PluginKibanaContextValue = CoreStart & {
    share?: SharePluginStart;
};
export declare const createKibanaContextForPlugin: (core: CoreStart) => import("@kbn/kibana-react-plugin/public").KibanaReactContext<PluginKibanaContextValue>;
export declare const useKibanaContextForPlugin: () => KibanaReactContextValue<PluginKibanaContextValue>;
export declare const useKibanaContextForPluginProvider: (core: CoreStart) => import("react").FC<import("react").PropsWithChildren<{
    services?: PluginKibanaContextValue | undefined;
}>>;
