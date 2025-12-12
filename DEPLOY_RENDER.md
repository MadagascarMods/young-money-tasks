# Guia de Deploy na Render.com

## Por Que Render em Vez de Netlify?

A Render oferece:
- ✅ Suporte nativo a Node.js/Express
- ✅ Proxy de API sem problemas
- ✅ Sem limitações de redirecionamento
- ✅ Melhor para aplicações dinâmicas
- ✅ Plano gratuito funcional

## Pré-requisitos

1. Conta no GitHub (para conectar o repositório)
2. Conta na Render.com (https://render.com)

## Passo a Passo

### 1. Preparar o Repositório no GitHub

```bash
# Clonar ou criar repositório
git init
git add .
git commit -m "Initial commit: Young Money Tasks"
git branch -M main
git remote add origin https://github.com/seu-usuario/young-money-tasks.git
git push -u origin main
```

### 2. Conectar na Render

1. Acesse https://render.com
2. Clique em "New +" → "Web Service"
3. Selecione "Deploy an existing repository"
4. Conecte sua conta GitHub
5. Selecione o repositório `young-money-tasks`

### 3. Configurar o Deploy

**Name:** young-money-tasks

**Runtime:** Node

**Build Command:** `npm install`

**Start Command:** `npm start`

**Plan:** Free (ou pago se preferir)

### 4. Variáveis de Ambiente

Não são necessárias para este projeto, mas você pode adicionar:

```
NODE_ENV=production
PORT=3000
```

### 5. Deploy

Clique em "Create Web Service" e aguarde o deploy ser concluído (2-3 minutos).

## Após o Deploy

Você receberá uma URL como:
```
https://young-money-tasks.onrender.com
```

### Acessar a Aplicação

**Página Principal:**
```
https://young-money-tasks.onrender.com
```

**Pix Assistindo:**
```
https://young-money-tasks.onrender.com/pix-assistindo.html?email=muriel55herrera@gmail.com&userId=3456
```

## Como Funciona

O servidor Express:
1. Serve os arquivos estáticos (HTML, CSS, JS)
2. Faz proxy das requisições `/api/*` para o Railway
3. Adiciona headers CORS automaticamente
4. Retorna as respostas para o cliente

## Troubleshooting

### Erro 404 ao acessar /pix-assistindo.html

Solução: O servidor redireciona automaticamente para `index.html` (SPA). Isso é normal.

### Erro ao conectar com API

Verifique:
1. Se o Railway está online
2. Se a URL do Railway está correta em `server.js`
3. Se há erros no console do navegador (F12)

### Logs do Deploy

Na Render, você pode ver os logs em:
1. Dashboard → Seu serviço
2. Aba "Logs"

## Atualizar o Projeto

Após fazer mudanças locais:

```bash
git add .
git commit -m "Descrição das mudanças"
git push origin main
```

A Render fará o deploy automaticamente!

## Remover o Projeto

Se quiser remover:
1. Acesse https://render.com/dashboard
2. Selecione o serviço
3. Clique em "Delete Service"

---

**Pronto para usar!** 🚀
