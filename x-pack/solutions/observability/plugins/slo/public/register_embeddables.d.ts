import type { CoreSetup } from '@kbn/core/public';
import type { SLOPublicPluginsSetup, SLOPublicPluginsStart, SLORepositoryClient } from './types';
export interface RegisterEmbeddablesDeps {
    core: CoreSetup<SLOPublicPluginsStart>;
    plugins: SLOPublicPluginsSetup;
    sloClient: SLORepositoryClient;
    kibanaVersion: string;
}
export declare const registerEmbeddables: ({ core, plugins, sloClient, kibanaVersion, }: RegisterEmbeddablesDeps) => void;
