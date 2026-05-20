import React from 'react';
interface AddDataPanelContent {
    title: string;
    content: string;
    img?: {
        name: string;
        baseFolderPath: string;
        position: 'inside' | 'below';
    };
}
interface AddDataPanelButton {
    href: string | undefined;
    label?: string;
}
type AddDataPanelButtonWithLabel = Required<AddDataPanelButton>;
export interface AddDataPanelProps {
    content: AddDataPanelContent;
    onDismiss?: () => void;
    onAddData: () => void;
    onTryIt?: () => void;
    onLearnMore: () => void;
    actions: {
        primary: AddDataPanelButtonWithLabel;
        secondary?: AddDataPanelButton;
        link: AddDataPanelButton;
    };
    'data-test-subj'?: string;
}
export declare function AddDataPanel({ content, actions, onDismiss, onLearnMore, onTryIt, onAddData, 'data-test-subj': dataTestSubj, }: AddDataPanelProps): React.JSX.Element;
export {};
