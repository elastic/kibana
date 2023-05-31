describe('Serverless', () => {
  it('Should navigate to the landing page', () => {
    cy.visit('/', {
      auth: {
        username: 'elastic',
        password: 'changeme',
      },
    })
    cy.get('[data-test-subj="securitySolutionNavHeading"]').should('exist');
  })
})