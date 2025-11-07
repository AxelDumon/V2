import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    build: {
      outDir: './build', // Output the build files to the `build` directory
      emptyOutDir: true, // Clean the output directory before building
    },
    server: {
      port: 5137, // Development server port
    },
}});