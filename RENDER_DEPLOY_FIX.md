# 🔧 Correção do Deploy no Render

## Problema Identificado

O erro `Unknown command: "build"` indica que o Render está tentando executar `npm build` em vez de `npm run build`.

## Soluções Implementadas

### 1. Package.json na Raiz
Criado um `package.json` na raiz do projeto com scripts que direcionam corretamente para os subdiretórios.

### 2. Render.yaml Atualizado
Atualizado o `render.yaml` para usar os scripts do package.json raiz.

## Configuração Atual

### Package.json Raiz
```json
{
  "scripts": {
    "install-backend": "cd backend && npm install",
    "install-frontend": "cd frontwpp && npm install",
    "build-backend": "cd backend && npm run build",
    "build-frontend": "cd frontwpp && npm run build",
    "start-backend": "cd backend && npm start",
    "start-frontend": "cd frontwpp && npm run serve"
  }
}
```

### Render.yaml
```yaml
services:
  - type: web
    name: resoluty-backend
    buildCommand: npm run install-backend && npm run build-backend
    startCommand: npm run start-backend
    
  - type: web
    name: resoluty-frontend
    buildCommand: npm run install-frontend && npm run build-frontend
    startCommand: npm run start-frontend
```

## Próximos Passos

1. **Commit as mudanças:**
   ```bash
   git add .
   git commit -m "Fix Render deploy configuration"
   git push origin main
   ```

2. **No Render Dashboard:**
   - Vá para o serviço que falhou
   - Clique em "Manual Deploy"
   - Ou aguarde o deploy automático

3. **Verificar Logs:**
   - Monitore os logs no dashboard do Render
   - Verifique se os comandos estão sendo executados corretamente

## Troubleshooting

### Se ainda houver problemas:

1. **Verificar Node Version:**
   - Certifique-se de que está usando Node 18+
   - O Render deve detectar automaticamente

2. **Verificar Dependências:**
   - Todos os package.json devem estar corretos
   - Dependências devem estar listadas

3. **Logs Detalhados:**
   - Acesse os logs completos no Render
   - Procure por erros específicos

### Comandos de Teste Local

```bash
# Testar build do backend
cd backend
npm install
npm run build

# Testar build do frontend
cd frontwpp
npm install
npm run build
```

## Estrutura Final

```
Resoluty/
├── package.json          # Package.json raiz com scripts
├── render.yaml           # Configuração do Render
├── .render-buildpacks.json # Buildpacks específicos
├── backend/
│   ├── package.json      # Dependências do backend
│   └── src/
├── frontwpp/
│   ├── package.json      # Dependências do frontend
│   └── src/
└── README.md
```

## Variáveis de Ambiente

Certifique-se de configurar todas as variáveis necessárias no dashboard do Render:

### Backend
- `OPENAI_API_KEY`
- `OPENAI_ASSISTANT_ID`
- `GHL_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- E outras conforme sua configuração

### Frontend
- `REACT_APP_API_URL` (será configurada automaticamente)

---

**✅ Após essas correções, o deploy deve funcionar corretamente!**