import type { DefaultEmbeddableApi, HasDrilldowns } from '@kbn/embeddable-plugin/public';
import type { EmbeddableApiContext, HasSupportedTriggers } from '@kbn/presentation-publishing';
import type { HasEditCapabilities, PublishesTitle, PublishesWritableTitle } from '@kbn/presentation-publishing';
import type { GroupOverviewCustomState, OverviewEmbeddableState } from '../../../../common/embeddables/overview/types';
export type SloOverviewApi = DefaultEmbeddableApi<OverviewEmbeddableState> & PublishesWritableTitle & PublishesTitle & HasDrilldowns & HasSloGroupOverviewConfig & HasEditCapabilities & HasSupportedTriggers;
export interface HasSloGroupOverviewConfig {
    getSloGroupOverviewConfig: () => GroupOverviewCustomState;
    updateSloGroupOverviewConfig: (next: GroupOverviewCustomState) => void;
}
export declare const apiHasSloGroupOverviewConfig: (api: unknown | null) => api is HasSloGroupOverviewConfig;
export type SloOverviewEmbeddableActionContext = EmbeddableApiContext & {
    embeddable: SloOverviewApi;
};
