## Security Guided Onboarding Tour

The [`EuiTourStep`](https://elastic.github.io/eui/#/display/tour) component needs an **anchor** to attach on in the DOM. This can be defined in 2 ways:
```
type EuiTourStepAnchorProps = ExclusiveUnion<{
  //Element to which the tour step popover attaches when open
  children: ReactElement;
  // Selector or reference to the element to which the tour step popover attaches when open
  anchor?: never;
}, {
  children?: never;
  anchor: ElementTarget;
}>;
```

It was important that the `EuiTourStep` **anchor** is in the DOM when the tour step becomes active. Additionally, when the **anchor** leaves the DOM, we need `EuiTourStep` to leave the DOM as well.

## How to use components (for OLM/D&R step engineers)

- Define your steps in [`./tour_config.ts`](https://github.com/elastic/kibana/pull/143598/files#diff-2c0372fc996eadbff00dddb92101432bf38cc1613895cb9a208abd8eb2e12930R136) in the `securityTourConfig` const
- For each step, implement the `GuidedOnboardingTourStep` component at the location of the **anchor**. As stated in the previous section, there are two ways to define the **anchor**. I will explain examples of both methods:

1. **Method 1 - as children.** Looking at step 1 of the `SecurityStepId.alertsCases` tour. In the `alertsCasesConfig` you can see the config for this step looks like:

    ```
    {
      ...defaultConfig,
      step: 1,
      title: i18n.translate('xpack.securitySolution.guided_onboarding.tour.ruleNameStep.tourTitle', {
        defaultMessage: 'Examine the Alerts Table',
      }),
      content: i18n.translate(
        'xpack.securitySolution.guided_onboarding.tour.ruleNameStep.tourContent',
        {
          defaultMessage:
            'To help you practice triaging alerts, here is the alert from the rule that we enabled in the previous step.',
        }
      ),
      anchorPosition: 'downCenter',
      dataTestSubj: getTourAnchor(1, SecurityStepId.alertsCases),
    }
    ```

   Notice that **no anchor prop is defined** in the step 1 config.
   As you can see pictured below, the tour step anchor is the Rule name of the first alert.

     <img width="1332" alt="1" src="https://user-images.githubusercontent.com/6935300/197848717-47c1959d-5dd5-4d72-a81d-786987000360.png">

   The component for this anchor is `RenderCellValue` which returns `DefaultCellRenderer`. We wrap  `DefaultCellRenderer` with `GuidedOnboardingTourStep`, passing `step={AlertsCasesTourSteps.pointToAlertName}  tourId={SecurityStepId.alertsCases}` to indicate the step. Since there are many other iterations of this component on the page, we also need to pass the `isTourAnchor` property to determine which of these components should be the anchor. In the code, this looks something like:

      ```
      export const RenderCellValue = (props) => {
        const { columnId, rowIndex, scopeId } = props;
        const isTourAnchor = useMemo(
          () =>
            columnId === SIGNAL_RULE_NAME_FIELD_NAME &&
            isDetectionsAlertsTable(scopeId) &&
            rowIndex === 0,
          [columnId, rowIndex, scopeId]
        );

        return (
          <GuidedOnboardingTourStep
            isTourAnchor={isTourAnchor}
            step={AlertsCasesTourSteps.pointToAlertName}
            tourId={SecurityStepId.alertsCases}
          >
            <DefaultCellRenderer {...props} />
          </GuidedOnboardingTourStep>
        );
      };
      ```

2. **Method 2 - as anchor props.** Looking at step 5 of the `SecurityStepId.alertsCases` tour. In the `alertsCasesConfig` you can see the config for this step looks like:

    ```
    {
      ...defaultConfig,
      step: 5,
      title: i18n.translate('xpack.securitySolution.guided_onboarding.tour.createCase.tourTitle', {
        defaultMessage: `Add details`,
      }),
      content: i18n.translate(
        'xpack.securitySolution.guided_onboarding.tour.createCase.tourContent',
        {
          defaultMessage: `In addition to the alert, you can add any relevant information you need to the case.`,
        }
      ),
      anchor: `[tour-step="create-case-flyout"]`,
      anchorPosition: 'leftUp',
      dataTestSubj: getTourAnchor(5, SecurityStepId.alertsCases),
    }
    ```

   Notice that the **anchor prop is defined** as `[tour-step="create-case-flyout"]` in the step 5 config.
   As you can see pictured below, the tour step anchor is the create case flyout and the next button is hidden.

     <img width="1336" alt="5" src="https://user-images.githubusercontent.com/6935300/197848670-09a6fa58-7417-4c9b-9be0-fb58224c2dc8.png">


     Since cases is its own plugin and we are using a method to generate the flyout, we cannot wrap the flyout as children of the `GuidedOnboardingTourStep`. We do however need the `EuiTourStep` component to mount in the same location as the anchor. Therefore, I had to pass a new optional property to the case component called `headerContent` that simply accepts and renders ` React.ReactNode` at the top of the flyout.  In the code, this looks something like:

      ```
      createCaseFlyout.open({
        attachments: caseAttachments,
        ...(isTourShown(SecurityStepId.alertsCases) && activeStep === AlertsCasesTourSteps.addAlertToCase
          ? {
              headerContent: (
                // isTourAnchor=true no matter what in order to
                // force active guide step outside of security solution (cases)
                <GuidedOnboardingTourStep isTourAnchor step={AlertsCasesTourSteps.createCase} tourId={SecurityStepId.alertsCases} />
              ),
            }
          : {}),
      });
      ```

- The **`useTourContext`** is used within anchor components, returning the state of the security tour
  ```
  export interface TourContextValue {
    activeStep: number;
    endTourStep: (tourId: SecurityStepId) => void;
    incrementStep: (tourId: SecurityStepId, step?: number) => void;
    isTourShown: (tourId: SecurityStepId) => boolean;
  }
  ```
  When the tour step does not have a next button, the anchor component will need to call `incrementStep` after an action is taken. For example, in `SecurityStepId.alertsCases` step 4, the user needs to click the "Add to case" button to advance the tour.

  <img width="1332" alt="4" src="https://user-images.githubusercontent.com/6935300/197850270-f08b9fe9-6f47-446d-b607-2b7295c8d35f.png">

  So we utilize the `useTourContext` to do the following check and increment the step in `handleAddToNewCaseClick`:
  ```
  if (isTourShown(SecurityStepId.alertsCases) && activeStep === AlertsCasesTourSteps.addAlertToCase) {
    incrementStep(SecurityStepId.alertsCases);
  }
  ```

  In `SecurityStepId.alertsCases` step 5, the user needs to fill out the form and hit the "Create case" button in order to end the `alertsCases` portion the tour, so with the  `afterCaseCreated` method we call `endTourStep(SecurityStepId.alertsCases)`.