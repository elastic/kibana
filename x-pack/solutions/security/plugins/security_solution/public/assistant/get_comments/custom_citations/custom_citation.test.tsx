import React from 'react';
import { render, screen } from '@testing-library/react';
import { CustomCitation } from "./custom_citation";
import userEvent from '@testing-library/user-event';

describe('CustomCitation', () => {
  it('renders correctly', async () => {
    render(<CustomCitation citationLable={"exampleLable"} citationUrl={"/example/link"} citationNumber={5}/>);
    expect(screen.getByText("[5]")).toBeInTheDocument()
    expect(screen.queryByText("exampleLable")).not.toBeInTheDocument()
    await userEvent.click(screen.getByText('[5]'));
    expect(screen.getByText("exampleLable")).toBeInTheDocument()
  });
});