import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { EmbeddablePublicDefinition } from '@kbn/embeddable-plugin/public';
import type { SLOPublicPluginsStart, SLORepositoryClient } from '../../../types';
import type { ErrorBudgetApi } from './types';
export declare const getErrorBudgetEmbeddableFactory: ({ coreStart, pluginsStart, sloClient, }: {
    coreStart: CoreStart;
    pluginsStart: SLOPublicPluginsStart;
    sloClient: SLORepositoryClient;
}) => EmbeddablePublicDefinition<Readonly<{
    title?: string | undefined;
    description?: string | undefined;
    hide_title?: boolean | undefined;
    hide_border?: boolean | undefined;
    drilldowns?: import("@kbn/embeddable-plugin/server").DrilldownState[] | undefined;
} & {
    slo_id: string;
    slo_instance_id: string;
}>, ErrorBudgetApi>;
