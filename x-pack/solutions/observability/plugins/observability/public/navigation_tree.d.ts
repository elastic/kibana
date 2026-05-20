import type { CoreStart } from '@kbn/core/public';
import type { AddSolutionNavigationArg } from '@kbn/navigation-plugin/public';
import type { ObservabilityPublicPluginsStart } from './plugin';
export declare const createDefinition: (coreStart: CoreStart, pluginsStart: ObservabilityPublicPluginsStart) => AddSolutionNavigationArg;
