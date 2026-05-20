import type { CoreStart } from '@kbn/core/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { SLOPublicPluginsStart } from '../types';
declare const useTypedKibana: <AdditionalServices extends object = {}>() => import("@kbn/kibana-react-plugin/public").KibanaReactContextValue<Partial<CoreStart> & CoreStart & SLOPublicPluginsStart & AdditionalServices & {
    storage: Storage;
    kibanaVersion: string;
}>;
export { useTypedKibana as useKibana };
