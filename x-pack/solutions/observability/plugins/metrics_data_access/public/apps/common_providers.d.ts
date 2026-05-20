import type { CoreStart } from '@kbn/core/public';
import React from 'react';
export interface CoreProvidersProps {
    children?: React.ReactNode;
    core: CoreStart;
}
export declare const CoreProviders: React.FC<CoreProvidersProps>;
