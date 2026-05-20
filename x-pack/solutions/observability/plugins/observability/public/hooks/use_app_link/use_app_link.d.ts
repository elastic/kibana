import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
interface Props {
    rule?: Rule;
}
export declare function useAppLink({ rule }: Props): {
    linkUrl: string;
    buttonText: string;
} | {
    linkUrl: null;
    buttonText: string;
};
export {};
