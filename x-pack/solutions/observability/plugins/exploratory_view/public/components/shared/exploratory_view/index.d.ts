import React from 'react';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
export interface ExploratoryViewPageProps {
    useSessionStorage?: boolean;
    saveAttributes?: (attr: TypedLensByValueInput['attributes'] | null) => void;
    app?: {
        id: string;
        label: string;
    };
}
export declare function ExploratoryViewPage({ app, saveAttributes, useSessionStorage, }: ExploratoryViewPageProps): React.JSX.Element;
export default ExploratoryViewPage;
export { DataTypes } from './labels';
