import React from 'react';
interface Props {
    isAutoRefreshing: boolean;
    disabled?: boolean;
    onClick: () => void;
}
export declare function AutoRefreshButton({ disabled, isAutoRefreshing, onClick }: Props): React.JSX.Element;
export {};
