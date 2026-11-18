# Legacy Security Solution flyout code (awaiting move)

The legacy expandable flyout is no longer mounted: the Security Solution only renders the new flyout from
[`flyout_v2`](https://github.com/elastic/kibana/tree/main/x-pack/solutions/security/plugins/security_solution/public/flyout_v2).

This folder only holds code that `flyout_v2` (or other areas of the plugin) still imports. It will be moved into
`flyout_v2` and this folder deleted. Do not add new code here: put it in `flyout_v2` instead.

`test/setup.ts` is the jest setup file shared by the `flyout_v2` jest configs.
