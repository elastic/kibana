import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { EmbeddablePublicDefinition } from '@kbn/embeddable-plugin/public';
import type { SLOPublicPluginsStart, SLORepositoryClient } from '../../../types';
import type { SloOverviewApi } from './types';
import type { OverviewEmbeddableState } from '../../../../common/embeddables/overview/types';
export declare const getOverviewEmbeddableFactory: ({ coreStart, pluginsStart, sloClient, }: {
    coreStart: CoreStart;
    pluginsStart: SLOPublicPluginsStart;
    sloClient: SLORepositoryClient;
}) => EmbeddablePublicDefinition<OverviewEmbeddableState, SloOverviewApi>;
