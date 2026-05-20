import React from 'react';
import type { OverviewMode } from '../../../../common/embeddables/overview/types';
export interface OverviewModeSelectorProps {
    value: string;
    onChange: (update: OverviewMode) => void;
}
export declare function OverviewModeSelector({ value, onChange }: OverviewModeSelectorProps): React.JSX.Element;
