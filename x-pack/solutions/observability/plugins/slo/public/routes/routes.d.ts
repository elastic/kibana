import React from 'react';
import type { ExperimentalFeatures } from '../../common/config';
export declare const getRoutes: (experimentalFeatures?: ExperimentalFeatures) => {
    [key: string]: {
        handler: () => React.ReactElement;
        params: Record<string, string>;
        exact: boolean;
    };
};
