import React from 'react';
interface MetricRowControlProps {
    onDelete: () => void;
    disableDelete: boolean;
}
export declare function MetricRowControls({ onDelete, disableDelete }: MetricRowControlProps): React.JSX.Element;
export {};
