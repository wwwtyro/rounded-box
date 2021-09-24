interface Options {
    width?: number;
    height?: number;
    depth?: number;
    radius?: number;
    resolution?: number;
}
export declare function generateRoundedBox(options?: Options): {
    positions: number[][];
    normals: number[][];
    cells: number[][];
};
export {};
