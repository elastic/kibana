import React from 'react';
export interface LoadWhenInViewProps {
    children: JSX.Element;
    initialHeight?: string | number;
    placeholderTitle: string;
}
export default function LoadWhenInView({ children, placeholderTitle, initialHeight, }: LoadWhenInViewProps): React.JSX.Element;
