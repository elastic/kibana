import React from 'react';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
export declare function ExpViewActionMenuContent({ timeRange, lensAttributes, }: {
    timeRange?: {
        from: string;
        to: string;
    };
    lensAttributes: TypedLensByValueInput['attributes'] | null;
}): React.JSX.Element;
