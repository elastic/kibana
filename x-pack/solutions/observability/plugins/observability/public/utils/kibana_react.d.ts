import type { CoreStart } from '@kbn/core/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { ObservabilityPublicPluginsStart } from '../plugin';
import type { TelemetryServiceStart } from '../services/telemetry/types';
export type StartServices<AdditionalServices extends object = {}> = CoreStart & ObservabilityPublicPluginsStart & AdditionalServices & {
    storage: Storage;
    kibanaVersion: string;
    telemetryClient: TelemetryServiceStart;
};
declare const useTypedKibana: <AdditionalServices extends object = {}>() => import("@kbn/kibana-react-plugin/public").KibanaReactContextValue<Partial<CoreStart> & CoreStart & ObservabilityPublicPluginsStart & AdditionalServices & {
    storage: Storage;
    kibanaVersion: string;
    telemetryClient: TelemetryServiceStart;
}>;
export { useTypedKibana as useKibana };
