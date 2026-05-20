import type { CoreStart } from '@kbn/core/public';
import type { ExploratoryViewPublicPluginsStart } from '../../../../plugin';
export type StartServices<AdditionalServices extends object = {}> = CoreStart & ExploratoryViewPublicPluginsStart & AdditionalServices & {
    isDev: boolean;
};
declare const useTypedKibana: <AdditionalServices extends object = {}>() => import("@kbn/kibana-react-plugin/public").KibanaReactContextValue<Partial<CoreStart> & CoreStart & ExploratoryViewPublicPluginsStart & AdditionalServices & {
    isDev: boolean;
}>;
export { useTypedKibana as useKibana };
