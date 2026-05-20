import React from 'react';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
export interface AddToCaseProps {
    autoOpen?: boolean;
    lensAttributes: TypedLensByValueInput['attributes'] | null;
    owner?: string;
    setAutoOpen?: (val: boolean) => void;
    timeRange: {
        from: string;
        to: string;
    };
}
export declare function AddToCaseAction({ autoOpen, lensAttributes, owner, setAutoOpen, timeRange, }: AddToCaseProps): React.JSX.Element;
export declare function CaseToastText({ linkUrl }: {
    linkUrl: string;
}): React.JSX.Element;
