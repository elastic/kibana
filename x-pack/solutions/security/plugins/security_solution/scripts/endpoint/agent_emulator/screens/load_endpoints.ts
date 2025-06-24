/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable require-atomic-updates */

import { blue, green } from 'chalk';
import type { DistinctQuestion } from 'inquirer';
import type { LoadEndpointsConfig } from '../types';
import { loadEndpoints } from '../services/endpoint_loader';
import type { EmulatorRunContext } from '../services/emulator_run_context';
import { ProgressFormatter } from '../../common/screen/progress_formatter';
import type { DataFormatter } from '../../common/screen';
import { ChoiceMenuFormatter, ScreenBaseClass } from '../../common/screen';
import { TOOL_TITLE } from '../constants';

interface LoadOptions {
  count: number;
  progress: ProgressFormatter;
  isRunning: boolean;
  isDone: boolean;
}

const promptQuestion = <TAnswers extends object = object>(
  options: DistinctQuestion<TAnswers>
): DistinctQuestion<TAnswers> => {
  const question: DistinctQuestion<TAnswers> = {
    type: 'input',
    name: 'Unknown?',
    message: 'Unknown?',
    // @ts-expect-error unclear why this is not defined in the definition file
    askAnswered: true,
    prefix: green('    ==> '),
    ...options,
  };

  if (question.default === undefined) {
    question.default = (answers: TAnswers) => {
      return answers[(question.name ?? '-') as keyof TAnswers] ?? '';
    };
  }

  return question;
};

export class LoadEndpointsScreen extends ScreenBaseClass {
  private runInfo: LoadOptions | undefined = undefined;
  private choices: ChoiceMenuFormatter = new ChoiceMenuFormatter([
    {
      title: 'Run',
      key: '1',
    },
    {
      title: 'Configure',
      key: '2',
    },
  ]);
  private config: LoadEndpointsConfig = { count: 2 };

  constructor(private readonly emulatorContext: EmulatorRunContext) {
    super();
  }

  private async loadSettings(): Promise<void> {
    const allSettings = await this.emulatorContext.getSettingsService().get();

    this.config = allSettings.endpointLoader;
  }

  private async saveSettings(): Promise<void> {
    const settingsService = this.emulatorContext.getSettingsService();

    const allSettings = await settingsService.get();
    await settingsService.save({
      ...allSettings,
      endpointLoader: this.config,
    });
  }

  protected header() {
    return super.header(TOOL_TITLE, 'Endpoint loader');
  }

  protected body(): string | DataFormatter {
    if (this.runInfo) {
      if (this.runInfo.isDone) {
        return this.doneView();
      }

      return this.loadingView();
    }

    return this.mainView();
  }

  protected onEnterChoice(choice: string) {
    const choiceValue = choice.trim().toUpperCase();

    switch (choiceValue) {
      case 'Q':
        this.hide();
        return;

      case '1':
        this.runInfo = {
          count: this.config.count,
          progress: new ProgressFormatter(),
          isRunning: false,
          isDone: false,
        };

        this.reRender();
        this.loadEndpoints();
        return;

      case '2':
        this.configView();
        return;

      default:
        if (!choiceValue) {
          if (this.runInfo?.isDone) {
            this.runInfo = undefined;
            this.reRender();
            return;
          }
        }

        this.throwUnknownChoiceError(choice);
    }
  }

  private async configView() {
    this.config = await this.prompt<LoadEndpointsConfig>({
      questions: [
        promptQuestion({
          type: 'number',
          name: 'count',
          message: 'How many endpoints to load?',
          validate(input: number, answers): boolean | string {
            if (!Number.isFinite(input)) {
              return 'Enter valid number';
            }
            return true;
          },
          filter(input: number): number | string {
            if (Number.isNaN(input)) {
              return '';
            }
            return input;
          },
        }),
      ],
      answers: this.config,
      title: blue('Endpoint Loader Settings'),
    });

    await this.saveSettings();
    this.reRender();
  }

  private async loadEndpoints() {
    const runInfo = this.runInfo;

    if (runInfo && !runInfo.isDone && !runInfo.isRunning) {
      runInfo.isRunning = true;

      await loadEndpoints({
        count: runInfo.count,
        esClient: this.emulatorContext.getEsClient(),
        kbnClient: this.emulatorContext.getKbnClient(),
        log: this.emulatorContext.getLogger(),
        onProgress: (progress) => {
          runInfo.progress.setProgress(progress.percent);
          this.reRender();
        },
      });

      runInfo.isDone = true;
      runInfo.isRunning = false;
      this.reRender();
    }
  }

  private mainView(): string | DataFormatter {
    return `
  Generate and load endpoints into elasticsearch along with associated
  fleet agents. Current settings:

      Count: ${this.config.count}

  Options:
  ${this.choices.output}`;
  }

  private loadingView(): string | DataFormatter {
    if (this.runInfo) {
      return `

  Creating ${this.runInfo.count} endpoint(s):

  ${this.runInfo.progress.output}
`;
    }

    return 'Unknown state';
  }

  private doneView(): string {
    return `${this.loadingView()}

  Done. Endpoint(s) have been loaded into Elastic/Kibana.
  Press Enter to continue
`;
  }

  async show(options: Partial<{ prompt: string; resume: boolean }> = {}): Promise<void> {
    await this.loadSettings();
    return super.show(options);
  }
}
