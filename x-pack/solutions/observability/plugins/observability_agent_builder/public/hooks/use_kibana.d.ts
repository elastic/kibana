import type { CoreStart } from '@kbn/core/public';
import type { ObservabilityAgentBuilderPluginStartDependencies } from '../types';
export declare const useKibana: () => import("@kbn/kibana-react-plugin/public").KibanaReactContextValue<Partial<CoreStart> & CoreStart & ObservabilityAgentBuilderPluginStartDependencies>;
