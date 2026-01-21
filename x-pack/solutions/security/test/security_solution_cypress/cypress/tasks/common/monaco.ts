/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Fills the ESQL query bar with the given query.
 */
export const setCodeEditorValue = (containerSelector: string, query: string) => {
  return cy.window().then((win) =>
    cy.get(containerSelector).then((elemHtml) => {
      const container = elemHtml.get(0);

      const editor = win
        .MonacoEnvironment!.monaco.editor.getEditors()
        .find((e: any) => container?.contains(e.getDomNode()));

      editor?.focus();
      const model = editor?.getModel();
      model?.setValue(query);

      const lastLine = model?.getLineCount();
      editor?.setPosition({
        lineNumber: lastLine ?? 1,
        column: model?.getLineMaxColumn(lastLine ?? 1) ?? 1,
      });
    })
  );
};

/**
 * Gets the value of the code editor.
 */
export const getCodeEditorValue = (containerSelector: string) => {
  return cy.window().then((win) =>
    cy.get(containerSelector).then((elemHtml) => {
      const container = elemHtml.get(0);

      const editor = win
        .MonacoEnvironment!.monaco.editor.getEditors()
        .find((e: any) => container?.contains(e.getDomNode()));

      return editor?.getModel()?.getValue() ?? '';
    })
  );
};
