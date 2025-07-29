# Resoluty Frontend

Frontend da aplicação Resoluty, construído com React, TypeScript e Material-UI.

## Tecnologias

- React 18
- TypeScript
- Material-UI
- Socket.IO Client
- Axios
- CRACO

## Configuração Local

1. Instale as dependências:
```bash
npm install
```

2. Execute em desenvolvimento:
```bash
npm start
```

## Deploy no Render

### Configuração do Render

1. **Build Command:**
```bash
npm install && npm run build
```

2. **Start Command:**
```bash
npm run serve
```

### Configurações Adicionais

- **Node Version:** 18.x ou superior
- **Auto-Deploy:** Habilitado para branch main
- **Static Site:** Sim (para melhor performance)

## Estrutura do Projeto

```
src/
├── components/       # Componentes React
├── services/        # Serviços de API
├── utils/           # Utilitários
├── App.tsx          # Componente principal
└── index.tsx        # Ponto de entrada
```

## Configuração da API

O frontend se conecta ao backend através do arquivo `src/services/apiService.ts`. 

Para produção, certifique-se de configurar a URL correta do backend:

```typescript
// Em src/services/apiService.ts
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
```

## Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `REACT_APP_API_URL` | URL do backend | `http://localhost:4000` |

## Scripts Disponíveis

- `npm start` - Executar em desenvolvimento
- `npm run build` - Build para produção
- `npm run serve` - Servir build de produção
- `npm test` - Executar testes

## Build de Produção

O build de produção é otimizado e inclui:

- Minificação de código
- Otimização de assets
- Tree shaking
- Code splitting

## Configuração do CRACO

O projeto usa CRACO para customizar a configuração do Create React App sem ejectar:

```javascript
// craco.config.js
module.exports = {
  // Configurações customizadas aqui
};
```