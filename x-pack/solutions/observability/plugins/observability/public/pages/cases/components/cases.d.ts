import React from 'react';
import type { CasesPermissions } from '@kbn/cases-plugin/common';
export interface CasesProps {
    permissions: CasesPermissions;
}
export declare function Cases({ permissions }: CasesProps): React.JSX.Element;
