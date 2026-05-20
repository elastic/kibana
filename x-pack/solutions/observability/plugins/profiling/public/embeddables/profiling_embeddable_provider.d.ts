import type { ReactChild } from 'react';
import React from 'react';
import type { CoreSetup, CoreStart } from '@kbn/core/public';
import type { ProfilingPluginPublicSetupDeps, ProfilingPluginPublicStartDeps } from '../types';
import type { Services } from '../services';
export interface ProfilingEmbeddablesDependencies {
    coreStart: CoreStart;
    coreSetup: CoreSetup<ProfilingPluginPublicStartDeps>;
    pluginsStart: ProfilingPluginPublicStartDeps;
    pluginsSetup: ProfilingPluginPublicSetupDeps;
    profilingFetchServices: Services;
}
export type GetProfilingEmbeddableDependencies = () => Promise<ProfilingEmbeddablesDependencies>;
interface Props {
    deps: ProfilingEmbeddablesDependencies;
    children: ReactChild;
}
export declare function ProfilingEmbeddableProvider({ deps, children }: Props): React.JSX.Element;
export {};
