export declare enum Color {
    color0 = "color0",
    color1 = "color1",
    color2 = "color2",
    color3 = "color3",
    color4 = "color4",
    color5 = "color5",
    color6 = "color6",
    color7 = "color7",
    color8 = "color8",
    color9 = "color9"
}
export type Palette = {
    [K in keyof typeof Color]: string;
};
export declare const defaultPalette: Palette;
export declare const createPaletteTransformer: (palette: Palette) => (color: Color) => string;
export declare const colorTransformer: (color: Color) => string;
export declare const sampleColor: (usedColors?: Color[]) => Color;
