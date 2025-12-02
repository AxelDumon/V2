import react from '@vitejs/plugin-react';  

/** @type {import('vite').UserConfig} */ 
export default {  
    server: {
        host: '0.0.0.0',
        port: 5016,
    },
    build: {
        outDir: './build',
        emptyOutDir: true,
    },
    // active le plugin react
    plugins: [react()],
};