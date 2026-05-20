import React from 'react';
import type { Subject } from 'rxjs';
interface Props {
    sloId: string | undefined;
    sloInstanceId: string | undefined;
    remoteName?: string;
    reloadSubject?: Subject<boolean>;
}
export declare function SloOverview({ sloId, sloInstanceId, remoteName, reloadSubject }: Props): React.JSX.Element;
export declare const LoadingContainer: import("styled-components").StyledComponent<"div", import("@kbn/react-kibana-context-styled/styled_provider").EuiTheme, {}, never>;
export declare const LoadingContent: import("styled-components").StyledComponent<"div", import("@kbn/react-kibana-context-styled/styled_provider").EuiTheme, {}, never>;
export {};
