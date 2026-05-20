import React from 'react';
export type CompositeSloBurnRateWindow = '5m' | '1h' | '1d';
export declare function getCompositeSloBurnRateWindowAriaLabel(window: CompositeSloBurnRateWindow): string;
export interface CompositeSloBurnRateWindowColumnHeaderProps {
    burnRateWindow: CompositeSloBurnRateWindow;
    onBurnRateWindowChange: (window: CompositeSloBurnRateWindow) => void;
    isPopoverOpen: boolean;
    setIsPopoverOpen: React.Dispatch<React.SetStateAction<boolean>>;
    buttonTestSubj: string;
    popoverAriaLabel: string;
    burnRateLabel: string;
}
export declare function CompositeSloBurnRateWindowColumnHeader({ burnRateWindow, onBurnRateWindowChange, isPopoverOpen, setIsPopoverOpen, buttonTestSubj, popoverAriaLabel, burnRateLabel, }: CompositeSloBurnRateWindowColumnHeaderProps): React.JSX.Element;
