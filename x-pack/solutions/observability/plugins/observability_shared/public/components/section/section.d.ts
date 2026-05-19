import type { EuiListGroupItemProps } from '@elastic/eui';
import type { ReactNode } from 'react';
import React from 'react';
import type { EuiListGroupProps } from '@elastic/eui';
export declare function SectionTitle({ children }: {
    children?: ReactNode;
}): React.JSX.Element;
export declare function SectionSubtitle({ children }: {
    children?: ReactNode;
}): React.JSX.Element;
export declare function SectionLinks({ children, ...props }: {
    children?: ReactNode;
} & EuiListGroupProps): React.JSX.Element;
export declare function SectionSpacer(): React.JSX.Element;
export declare const Section: import("styled-components").StyledComponent<"div", any, {}, never>;
export type SectionLinkProps = EuiListGroupItemProps;
export declare function SectionLink({ ...props }: SectionLinkProps): React.JSX.Element;
