import type { EmbeddablePublicDefinition } from '@kbn/embeddable-plugin/public';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { BurnRateApi } from './types';
import type { SLOPublicPluginsStart, SLORepositoryClient } from '../../../types';
export declare const getBurnRateEmbeddableFactory: ({ coreStart, pluginsStart, sloClient, }: {
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
    duration: string;
    slo_id: string;
    slo_instance_id: string;
}>, BurnRateApi>;
