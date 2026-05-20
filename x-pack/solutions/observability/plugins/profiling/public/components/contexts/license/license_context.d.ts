import type { ILicense } from '@kbn/licensing-types';
import React from 'react';
export declare const LicenseContext: React.Context<ILicense | undefined>;
export declare function LicenseProvider({ children }: {
    children: React.ReactNode;
}): React.JSX.Element;
