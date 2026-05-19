type Search = Record<string, string | string[]>;
export interface LinkDescriptor {
    app: string;
    pathname?: string;
    hash?: string;
    search?: Search;
    state?: unknown;
}
export interface LinkProps {
    href?: string;
    onClick?: (e: React.MouseEvent | React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
}
export interface Options {
    hrefOnly?: boolean;
}
export declare const useLinkProps: ({ app, pathname, hash, search, state }: LinkDescriptor, options?: Options) => LinkProps;
export declare const shouldHandleLinkEvent: (e: React.MouseEvent | React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => boolean;
export {};
