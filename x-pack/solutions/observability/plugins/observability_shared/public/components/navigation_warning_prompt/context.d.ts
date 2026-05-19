import type { PropsWithChildren } from 'react';
import React from 'react';
interface ContextValues {
    prompt?: string;
    setPrompt: (prompt: string | undefined) => void;
}
export declare const NavigationWarningPromptContext: React.Context<ContextValues>;
export declare const useNavigationWarningPrompt: () => ContextValues;
export declare function NavigationWarningPromptProvider({ children }: PropsWithChildren<{}>): React.JSX.Element;
export {};
