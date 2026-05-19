import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { minify } from 'terser';

function minifyUmdPlugin() {
  return {
    name: 'minify-umd',
    async renderChunk(code, chunk, outputOptions) {
      const result = await minify(code, {
        sourceMap: outputOptions.sourcemap ? { asObject: true } : false
      });

      if (!result.code) {
        throw new Error(`Terser produced no output for ${chunk.fileName}.`);
      }

      return {
        code: result.code,
        map: result.map ?? null
      };
    }
  };
}

export default [
  // ESM (original source kept as-is)
  {
    input: 'src/EdNotes.RichText/wwwroot/editor/ednotes.richtext.bundle.js',
    output: {
      file: 'dist/ednotes.richtext.esm.js',
      format: 'esm',
      sourcemap: true
    },
    plugins: [resolve(), commonjs()]
  },
  // UMD build for direct <script> usage
  {
    input: 'src/EdNotes.RichText/wwwroot/editor/ednotes.richtext.bundle.js',
    output: {
      file: 'dist/ednotes.richtext.umd.js',
      format: 'umd',
      name: 'EdNotesRichText',
      sourcemap: true,
      globals: { katex: 'katex' }
    },
    external: ['katex'],
    plugins: [resolve(), commonjs()]
  },
  // Minified UMD
  {
    input: 'src/EdNotes.RichText/wwwroot/editor/ednotes.richtext.bundle.js',
    output: {
      file: 'dist/ednotes.richtext.umd.min.js',
      format: 'umd',
      name: 'EdNotesRichText',
      sourcemap: true,
      globals: { katex: 'katex' }
    },
    external: ['katex'],
    plugins: [resolve(), commonjs(), minifyUmdPlugin()]
  }
];