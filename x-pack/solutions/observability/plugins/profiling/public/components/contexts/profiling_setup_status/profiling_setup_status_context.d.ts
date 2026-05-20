import React from 'react';
import type { ProfilingSetupStatus } from '../../../services';
export declare const ProfilingSetupStatusContext: React.Context<{
    profilingSetupStatus: ProfilingSetupStatus | undefined;
    setProfilingSetupStatus: React.Dispatch<React.SetStateAction<ProfilingSetupStatus | undefined>>;
} | undefined>;
export declare function ProfilingSetupStatusContextProvider({ children, }: {
    children: React.ReactElement;
}): React.JSX.Element;
