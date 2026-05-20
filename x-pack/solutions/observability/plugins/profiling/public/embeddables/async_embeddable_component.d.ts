import React from 'react';
interface Props {
    isLoading: boolean;
    children: React.ReactElement;
}
export declare function AsyncEmbeddableComponent({ children, isLoading }: Props): React.JSX.Element;
export {};
