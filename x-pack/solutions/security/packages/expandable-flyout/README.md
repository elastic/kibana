# @kbn/expandable-flyout

## Purpose

This package offers an expandable flyout UI component and a way to manage the data displayed in it. The component leverages the [EuiFlyout](https://github.com/elastic/eui/tree/main/src/components/flyout) from the EUI library.

The flyout is composed of 3 sections:

- a right section (primary section) that opens first
- a left wider section to show more details
- a preview section, that overlays the right section. This preview section can display multiple panels one after the other and displays a `Back` button

> Run `yarn storybook expandable_flyout` to take a quick look at the expandable flyout in action

## Design decisions

The expandable-flyout offers 2 render modes: push and overlay (leveraged from the use of the see [EUI](https://eui.elastic.co/#/layout/flyout#push-versus-overlay)).

The flyout offers 2 sets of default widths: one for overlay mode and one for push mode. Those width are calculated based on the width of the brower window, and define the default values to be used to render the right, left and preview sections, in a way that is aesthetically pleasing. You can find the details of the calculations [here](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/packages/expandable-flyout/src/hooks/use_window_width.ts);

> While the expandable-flyout will work on very small screens, having both the right and left sections visible at the same time will not be a good experience to the user. We recommend only showing the right panel, and therefore handling this situation when you build your panels by considering hiding the actions that could open the left panel (like the expand details button in the [FlyoutNavigation](https://github.com/elastic/kibana/tree/main/x-pack/solutions/security/plugins/security_solution/public/flyout/shared/components/flyout_navigation.tsx)).

The flyout also offers a way to the users to change the width of the different sections. These are saved separately from the default widths mentioned above, and the users can always reset back to the default using the gear menu (see the `Optional properties` section below).

## State persistence

The expandable flyout offers 2 ways of managing its state:

### Memory storage

The default behavior saves the state of the flyout in memory. The state is internal to the package and based on an isolated redux context. Using this mode means the state will not be persisted when sharing url or reloading browser pages.

### Url storage

The second way (done by setting the `urlKey` prop to a string value) saves the state of the flyout in the url. This allows the flyout to be automatically reopened when users refresh the browser page, or when users share an url. The `urlKey` will be used as the url parameter.

**_Note: the word `memory` cannot be used as an `urlKey` as it is reserved for the memory storage behavior. You can use any other string value, try to use something that should be unique._**

> We highly recommend NOT nesting flyouts in your code, as it would cause conflicts for the url keys. We recommend instead to build multiple panels, with each their own context to manage their data (for example, take a look at the Security Solution [setup](https://github.com/elastic/kibana/tree/main/x-pack/solutions/security/plugins/security_solution/public/flyout)).
>
> A good solution is for example to have one instance of a flyout at a page level, and then have multiple panels that can be opened in that flyout.

## Package API

The ExpandableFlyout [React component](https://github.com/elastic/kibana/tree/main/x-pack/solutions/security/packages/expandable-flyout/src/index.tsx) renders the UI, leveraging an [EuiFlyout](https://eui.elastic.co/#/layout/flyout).

To retrieve the flyout's layout (left, right and preview panels), you can utilize [useExpandableFlyoutState](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/packages/expandable-flyout/src/hooks/use_expandable_flyout_state.ts).

To control (or mutate) flyout's layout, you can utilize [useExpandableFlyoutApi](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/packages/expandable-flyout/src/hooks/use_expandable_flyout_api.ts).

**Expandable Flyout API** exposes the following methods:

- **openFlyout**: open the flyout with a set of panels
- **openRightPanel**: open a right panel
- **openLeftPanel**: open a left panel
- **openPreviewPanel**: open a preview panel
- **closeRightPanel**: close the right panel
- **closeLeftPanel**: close the left panel
- **closePreviewPanel**: close the preview panels
- **previousPreviewPanel**: navigate to the previous preview panel
- **closeFlyout**: close the flyout

> The expandable flyout propagates the `onClose` callback from the EuiFlyout component. As we recommend having a single instance of the flyout in your application, it's up to the application's code to dispatch the event (through Redux, window events, observable, prop drilling...).

When calling `openFlyout`, the right panel state is automatically appended in the `history` slice in the redux context. To access the flyout's history, you can use the [useExpandableFlyoutHistory](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/packages/expandable-flyout/src/hooks/use_expandable_flyout_history.ts) hook.

## Usage

To use the expandable flyout in your plugin, first you need wrap your code with the [context provider](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/packages/expandable-flyout/src/context.tsx) at a high enough level as follows:

```typescript jsx
// state stored in the url
<ExpandableFlyoutProvider urlKey={'myUrlKey'}>
  ...
</ExpandableFlyoutProvider>


// state stored in memory
<ExpandableFlyoutProvider>
  ...
</ExpandableFlyoutProvider>
```

Then use the [React UI component](https://github.com/elastic/kibana/tree/main/x-pack/solutions/security/packages/expandable-flyout/src/index.tsx) where you need:

```typescript jsx
<ExpandableFlyout registeredPanels={myPanels} />
```

_where `myPanels` is a list of all the panels that can be rendered in the flyout_

## Optional properties

The expandable flyout now offers a way for users to change some of the flyout's UI properties. These are done via a gear icon in the top right corner of the flyout, to the left of the close icon.

```typescript
flyoutCustomProps ? : {
  hideSettings? : boolean;
  pushVsOverlay? : { disabled: boolean; tooltip: string; };
  resize? : { disabled: boolean; tooltip: string; };
};
```

The gear icon can be hidden by setting the `hideSettings` property to `true` in the flyout's custom props. When shown, clicking on the gear icon opens a popover with the other options rendered in it.

The `pushVsOverlay` property allows to disable the push/overlay toggle and when enabled allows users to switch between the 2 modes (see [EUI](https://eui.elastic.co/#/layout/flyout#push-versus-overlay)). The default value is `overlay`. The package remembers the selected value in local storage, only for expandable flyout that have a urlKey. The state of memory flyouts is not persisted.

The `resize` property allow to disable the `Reset size` button and when enabled allows users to reset all the widths to the default (see calculations [here](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/packages/expandable-flyout/src/hooks/use_window_width.ts)).

## Terminology

### Section

One of the 3 areas of the flyout (**left**, **right** or **preview**).

### Panel

A set of properties defining what's displayed in one of the flyout section (see interface [here](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/packages/expandable-flyout/src/types.ts)).
