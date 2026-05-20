import React from 'react';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
interface Props {
    timeRange?: {
        from: string;
        to: string;
    };
    lensAttributes: TypedLensByValueInput['attributes'] | null;
}
export declare function ExpViewActionMenu(props: Props): React.JSX.Element;
export {};
