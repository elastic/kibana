import React from 'react';
import type { AnalyticsServiceSetup, CoreStart } from '@kbn/core/public';
import type { ExploratoryViewPublicPluginsStart } from '../../../..';
import type { ExploratoryEmbeddableProps } from './embeddable';
export declare function getExploratoryViewEmbeddable(services: CoreStart & ExploratoryViewPublicPluginsStart, analytics?: AnalyticsServiceSetup): (props: ExploratoryEmbeddableProps) => React.JSX.Element | null;
