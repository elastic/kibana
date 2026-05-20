import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { EmbeddablePublicDefinition } from '@kbn/embeddable-plugin/public';
import type { SLOPublicPluginsStart, SLORepositoryClient } from '../../../types';
import type { SloAlertsApi } from './types';
export declare const getAlertsPanelTitle: () => string;
export declare function getAlertsEmbeddableFactory({ coreStart, pluginsStart, sloClient, kibanaVersion, }: {
    coreStart: CoreStart;
    pluginsStart: SLOPublicPluginsStart;
    sloClient: SLORepositoryClient;
    kibanaVersion: string;
}): EmbeddablePublicDefinition<Readonly<{
    title?: string | undefined;
    description?: string | undefined;
    hide_title?: boolean | undefined;
    hide_border?: boolean | undefined;
    drilldowns?: import("@kbn/embeddable-plugin/server").DrilldownState[] | undefined;
} & {
    slos: Readonly<{} & {
        slo_id: string;
        slo_instance_id: string;
    }>[];
}>, SloAlertsApi>;
