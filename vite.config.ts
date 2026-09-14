import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Publicado em https://le0nardo-carvalho.github.io/financeiro/ — base precisa bater com o nome do repositório.
export default defineConfig({
  base: '/financeiro/',
  plugins: [react()],
})
