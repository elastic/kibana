import type { ReactNode } from 'react';
import React from 'react';
import type { Action } from './types';
interface ActionModalContextValue {
    triggerAction: (action: Action) => void;
}
export declare function ActionModalProvider({ children }: {
    children: ReactNode;
}): React.JSX.Element;
export declare function useActionModal(): ActionModalContextValue;
export {};
