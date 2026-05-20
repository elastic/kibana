import React from 'react';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
export type PanelId = 'seriesPanel' | 'chartPanel';
export declare function ExploratoryView({ saveAttributes, }: {
    saveAttributes?: (attr: TypedLensByValueInput['attributes'] | null) => void;
}): React.JSX.Element;
