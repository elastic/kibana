import type { CoreStart } from '@kbn/core/server';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import type { PluginStart as DataPluginStart } from '@kbn/data-plugin/server';
import type { RuleQueryInspectorFn } from '@kbn/alerting-plugin/server';
type GetStartServices = () => Promise<[
    CoreStart,
    {
        dataViews: DataViewsServerPluginStart;
        data: DataPluginStart;
    }
]>;
interface QueryInspectorOptions {
    compositeSize: number;
}
export declare const createQueryInspector: (getStartServices: GetStartServices, options: QueryInspectorOptions) => RuleQueryInspectorFn;
export {};
