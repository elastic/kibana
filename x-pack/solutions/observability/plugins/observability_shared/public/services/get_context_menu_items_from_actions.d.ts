import type { EuiContextMenuItemProps } from '@elastic/eui';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
export type ObservabilityActionContextMenuItemProps = EuiContextMenuItemProps & {
    children: React.ReactElement;
};
export declare function getContextMenuItemsFromActions({ uiActions, triggerId, context, }: {
    uiActions: UiActionsStart;
    triggerId: string;
    context: Record<string, any>;
}): Promise<ObservabilityActionContextMenuItemProps[]>;
