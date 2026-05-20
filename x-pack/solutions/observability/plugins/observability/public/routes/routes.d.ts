interface RouteDefinition {
    handler: () => JSX.Element;
    params: object;
    exact: boolean;
}
export declare const useAppRoutes: () => {
    [x: string]: RouteDefinition;
};
export {};
