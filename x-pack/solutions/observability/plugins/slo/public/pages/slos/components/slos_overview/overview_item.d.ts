import React from 'react';
export declare function OverviewItem({ title, description, titleColor, isLoading, query, tooltip, onClick, }: {
    title?: string | number;
    description: string;
    titleColor: string;
    isLoading: boolean;
    query?: string;
    tooltip?: string;
    onClick?: () => void;
}): React.JSX.Element;
